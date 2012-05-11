#!/usr/bin/env python
#
# Copyright 2008 Google Inc.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.


"""A collaborative slide making web application built on Google App Engine.
   Based on tasks list app by Bret Taylor."""

import datetime
import os
import random
import string
import sys
import logging
import re

from google.appengine.api import users
from google.appengine.ext import db
from google.appengine.ext import webapp
from google.appengine.ext.webapp import template
from google.appengine.ext.webapp.util import login_required
from google.appengine.ext.webapp.util import run_wsgi_app
from google.appengine.api import urlfetch

from django.utils import simplejson

# Set to true if we want to have our webapp print stack traces, etc
_DEBUG = True


# Add our custom Django template filters to the built in filters
template.register_template_library('templatefilters')

def is_devserver():
    return os.environ['SERVER_SOFTWARE'].startswith('Dev')

def remove_html_tags(data):
  p = re.compile(r'<.*?>')
  return p.sub('', data)

def remove_divs(data):
  p = re.compile(r'<[/]*div.*?>')
  data = p.sub('', data)
  # And spans..
  # TODO: Replace the monospace spans with PRE tags.
  # Maybe use BeautifulSoup
  p = re.compile(r'<[/]*span.*?>')
  data = p.sub('', data)
  p = re.compile(r'<[/]*font.*?>')
  data = p.sub('', data)
  # And styles.. most styles don't matter
  p = re.compile(r' style=".*?"')
  data = p.sub('', data)
  # And silly clear="none" on brs
  data = data.replace(' clear="none"', '')
  return data

class SlideSet(db.Model):
  """A SlideSet is that encompasses all the slides.

  Other than the slides referring to it, a SlideSet just has meta-data, like
  whether it is published and the date at which it was last updated.
  """
  title      = db.StringProperty(required=False)
  created    = db.DateTimeProperty(auto_now_add=True)
  updated    = db.DateTimeProperty(auto_now=True)
  published  = db.BooleanProperty(default=False)
  theme      = db.StringProperty()
  flavor     = db.StringProperty()
  slide_ids  = db.ListProperty(int)

  def get_slides(self):
    slide_keys = []
    for id in self.slide_ids:
      slide_keys.append(db.Key.from_path('Slide', id))
    return db.get(slide_keys)

  def to_dict(self, with_slides=False):
    self_dict = {'title':    self.title,
                'theme':     self.theme,
                'published': self.published,
                'slide_ids': self.slide_ids,
                'flavor':    self.flavor}
    if with_slides:
      slides_dict = []
      slides = self.get_slides()
      for slide in slides:
        slides_dict.append(slide.to_dict())
      self_dict['slides'] = slides_dict
    return self_dict

  def to_json(self, with_slides=False):
    return simplejson.dumps(self.to_dict(with_slides=with_slides))

  @staticmethod
  def get_current_user_sets():
    """Returns the slidesets that the current user has access to."""
    return SlideSet.get_user_sets(users.get_current_user())

  @staticmethod
  def get_user_sets(user):
    """Returns the slide sets that the given user has access to."""
    if not user: return []
    memberships = db.Query(SlideSetMember).filter('user =', user)
    return [m.slide_set for m in memberships]

  def current_user_has_access(self):
    """Returns true if the current user has access to this slide set."""
    return self.user_has_access(users.get_current_user())

  def user_has_access(self, user):
    """Returns true if the given user has access to this slide set."""
    if not user: return False
    query = db.Query(SlideSetMember)
    query.filter('slide_set =', self)
    query.filter('user =', user)
    return query.get()


class Slide(db.Model):
  """Represents a single slide in a slide set.
  """

  content = db.TextProperty()
  index = db.IntegerProperty()
  created = db.DateTimeProperty(auto_now_add=True)
  updated = db.DateTimeProperty(auto_now=True)

  def to_dict(self):
    return {'id':        self.key().id(),
            'content':   self.content}

  def to_json(self):
    return simplejson.dumps(self.to_dict())


class SlideSetMember(db.Model):
  """Represents the many-to-many relationship between SlideSets and Users.

  This is essentially the slide set Access Control List (ACL).
  """
  slide_set = db.Reference(SlideSet, required=True)
  user = db.UserProperty(required=True)


class BaseRequestHandler(webapp.RequestHandler):
  """Supplies a common template generation function.

  When you call generate(), we augment the template variables supplied with
  the current user in the 'user' variable and the current webapp request
  in the 'request' variable.
  """
  def generate(self, template_name, template_values={}):
    self.response.out.write(self.get_html(template_name, template_values))
    
  def get_html(self, template_name, template_values={}):
    values = {
        'request': self.request,
        'user': users.get_current_user(),
        'login_url': users.create_login_url(self.request.uri),
        'logout_url': users.create_logout_url('http://%s/' % (
            self.request.host,)),
        'debug': is_devserver(),
        }
    values.update(template_values)
    directory = os.path.dirname(__file__)
    path = os.path.join(directory, os.path.join('templates', template_name)) 
    return template.render(path, values)
    

class InboxPage(BaseRequestHandler):
  """Lists all the slide sets for the current user."""
  @login_required
  def get(self):
    sets = SlideSet.get_current_user_sets()
    self.generate('index.html', {
        'sets': sets})


class SlideSetViewPage(BaseRequestHandler):
  """Displays a single slide set based on ID.

  If the slide set is not published, we give a 403 unless the user is a
  collaborator on the list. If it is published, but the user is not a
  collaborator, we show the more limited HTML view of the slide set rather
  than the interactive AJAXy edit page.
  """

  # The different slide set output types we support: content types and
  # template file extensions
  _OUTPUT_TYPES = {
    'pdf': ['application/pdf', 'slide', 'html'],
    'edit': ['text/html', 'edit', 'html'],
    'slide': ['text/html', 'slide', 'html'],
    'atom': ['application/atom+xml', 'atom', 'xml'],}

  def get(self):
    slide_set = SlideSet.get_by_id(int(self.request.get('id')))
    if not slide_set:
      self.error(403)
      return

    # Choose a template based on the output type
    output_name = self.request.get('output')
    if output_name not in SlideSetPage._OUTPUT_TYPES:
      output_name = 'edit'
    output_type = SlideSetPage._OUTPUT_TYPES[output_name]

    # Validate this user has access to this slide set. If not, they can
    # access the html view of this set only if it is published.
    can_edit = False
    if slide_set.current_user_has_access():
      # Set user to pass into template values
      can_edit = True
    else:
      if slide_set.published:
        # Redirect edit requests to view requests
        if output_name == 'edit':
          output_name = 'slide'
          output_type = SlideSetPage._OUTPUT_TYPES[output_name]
      else:
        if users.get_current_user():
          self.error(403)
        else:
          self.redirect(users.create_login_url(self.request.uri))
        return

    slides = list(slide_set.get_slides().order('index'))

    # Workaround for newlines in JS output
    if output_name == 'edit':
      for slide in slides:
        slide.content = slide.content.replace('\n', 'NEWLINE').replace('\r', '')
    
    template_name = 'slideset_%s.%s' % (output_type[1], output_type[2])
    template_values = {
        'can_edit': can_edit,
        'slide_set': slide_set,
        'slides': slides,
        'printable': self.request.get('printable')
        }
        
    ### PDF
    if output_name == 'pdf':
      import pdfcred
      import pdfcrowd

      client = pdfcrowd.Client('pamelafox', pdfcred.password)
      client.usePrintMedia(True)
      pdf = client.convertHtml(self.get_html(template_name, template_values), self.response.out)
      
      
    self.response.headers['Content-Type'] = output_type[0]
    self.generate(template_name, template_values)


class SlideSetEditPage(BaseRequestHandler):

  def get(self, slide_set_id):
    slide_set = SlideSet.get_by_id(int(slide_set_id))
    if not slide_set:
      self.error(403)
      return

    can_edit = False
    if slide_set.current_user_has_access():
      can_edit = True
    else:
      if slide_set.published:
        # redirect 
        self.redirect('viewer/set/%s' % slide_set_id)
      else:
        if users.get_current_user():
          self.error(403)
        else:
          self.redirect(users.create_login_url(self.request.uri))
        return

    template_name = 'slideset_edit.html'
    template_values = {
        'can_edit': can_edit,
        'slide_set': slide_set
        }
      
    self.response.headers['Content-Type'] = 'text/html'
    self.generate(template_name, template_values)



class CreateSlideSetAction(BaseRequestHandler):
  """Creates a new slide set for the current user."""
  def post(self):
    user = users.get_current_user()
    name = self.request.get('name')
    if not user or not name:
      self.error(403)
      return

    slide_set = SlideSet(title=name)
    slide_set.put()
    slide_set_member = SlideSetMember(slide_set=slide_set, user=user)
    slide_set_member.put()

    if self.request.get('next'):
      self.redirect(self.request.get('next'))
    else:
      self.redirect('/set?id=' + str(slide_set.key().id()))


class SlideAPI(webapp.RequestHandler):

  def post(self, slide_set_id, slide_id):
    logging.info('Creating new slide')
    content      = self.request.get('content')
    slide_set    = SlideSet.get_by_id(int(slide_set_id))
    slide = Slide()
    slide.content = content  
    slide.put()
    slide_set.slide_ids.append(slide.key().id())
    slide_set.put()
    self.response.out.write(slide.to_json())
  
  def put(self, slide_set_id, slide_id):
    logging.info('Updating existing slide')
    body         = simplejson.loads(self.request.body)
    content      = body['content']
    slide = Slide.get_by_id(int(slide_id))
    slide.content = content
    slide.put()
    self.response.out.write(slide.to_json())

  def get(self, slide_set_id, slide_id):
    slide     = Slide.get_by_id(int(slide_id))
    self.response.headers['Content-Type'] = 'application/json'
    self.response.out.write(slide.to_json())


class SlideSetAPI(webapp.RequestHandler):

  def post(self, slide_set_id):
    # make changes - theme, published, title, order
    pass
  
  def get(self, slide_set_id):
    slide_set    = SlideSet.get_by_id(int(slide_set_id))
    self.response.headers['Content-Type'] = 'application/json'
    self.response.out.write(slide_set.to_json(with_slides=True))


def main():
  application = webapp.WSGIApplication([
      ('/', InboxPage),
      ('/edit/set/(.*)',           SlideSetEditPage),
      ('/view/set/(.*)',           SlideSetViewPage),
      ('/api/set/(.*)/slide/(.*)', SlideAPI),
      ('/api/set/(.*)',            SlideSetAPI),
      ('/createslideset.do', CreateSlideSetAction),
      ], debug=_DEBUG)
  run_wsgi_app(application)


if __name__ == '__main__':
  main()
