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
  name = db.StringProperty(required=True)
  created = db.DateTimeProperty(auto_now_add=True)
  updated = db.DateTimeProperty(auto_now=True)
  published = db.BooleanProperty(default=False)
  theme = db.StringProperty()

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


class SlideSetMember(db.Model):
  """Represents the many-to-many relationship between SlideSets and Users.

  This is essentially the slide set Access Control List (ACL).
  """
  slide_set = db.Reference(SlideSet, required=True)
  user = db.UserProperty(required=True)


class Slide(db.Model):
  """Represents a single slide in a slide set.

  A slide can be one of several types with different sets of content
    Intro: Title, SubTitle, Section
    Section: Title, Section
    Default: Title, Content, Section

  """

  TYPE_INTRO = 'intro'
  TYPE_SECTION = 'section'
  TYPE_NORMAL = 'normal'

  type = db.StringProperty(required=True)
  title = db.StringProperty()
  subtitle = db.StringProperty()
  section = db.StringProperty()
  content = db.TextProperty()
  index = db.IntegerProperty()
  slide_set = db.Reference(SlideSet)
  created = db.DateTimeProperty(auto_now_add=True)
  updated = db.DateTimeProperty(auto_now=True)


class BaseRequestHandler(webapp.RequestHandler):
  """Supplies a common template generation function.

  When you call generate(), we augment the template variables supplied with
  the current user in the 'user' variable and the current webapp request
  in the 'request' variable.
  """
  def generate(self, template_name, template_values={}):
    values = {
        'request': self.request,
        'user': users.get_current_user(),
        'login_url': users.create_login_url(self.request.uri),
        'logout_url': users.create_logout_url('http://%s/' % (
            self.request.host,)),
        'debug': False,
        'application_name': 'Task Manager',}
    values.update(template_values)
    directory = os.path.dirname(__file__)
    path = os.path.join(directory, os.path.join('templates', template_name))
    self.response.out.write(template.render(path, values, debug=_DEBUG))


class InboxPage(BaseRequestHandler):
  """Lists all the slide sets for the current user."""
  @login_required
  def get(self):
    sets = SlideSet.get_current_user_sets()
    self.generate('index.html', {
        'sets': sets})


class SlideSetPage(BaseRequestHandler):
  """Displays a single slide set based on ID.

  If the slide set is not published, we give a 403 unless the user is a
  collaborator on the list. If it is published, but the user is not a
  collaborator, we show the more limited HTML view of the slide set rather
  than the interactive AJAXy edit page.
  """

  # The different slide set output types we support: content types and
  # template file extensions
  _OUTPUT_TYPES = {
    'edit': ['text/html', 'html'],
    'slide': ['text/html', 'html'],
    'atom': ['application/atom+xml', 'xml'],}

  def get(self):
    slide_set = SlideSet.get(self.request.get('id'))
    if not slide_set:
      self.error(403)
      return

    # Choose a template based on the output type
    output_name = self.request.get('output')
    if output_name not in SlideSetPage._OUTPUT_TYPES:
      output_name = 'edit'
    output_type = SlideSetPage._OUTPUT_TYPES[output_name]

    # Validate this user has access to this slide set. If not, they can
    # access the html view of this list only if it is published.
    if not slide_set.current_user_has_access():
      if slide_set.published:
        if output_name == 'edit':
          output_name = 'slide'
          output_type = SlideSetPage._OUTPUT_TYPES[output_name]
      else:
        user = users.get_current_user()
        if not user:
          self.redirect(users.create_login_url(self.request.uri))
        else:
          self.error(403)
        return

    slides = list(slide_set.slide_set.order('index'))

    # Workaround for newlines in JS output
    if output_name == 'edit':
      for slide in slides:
        slide.content = slide.content.replace('\n', 'NEWLINE')

    self.response.headers['Content-Type'] = output_type[0]
    self.generate('slideset_%s.%s' % (output_name, output_type[1]), {
        'slide_set': slide_set,
        'slides': slides
        })


class CreateSlideSetAction(BaseRequestHandler):
  """Creates a new slide set for the current user."""
  def post(self):
    user = users.get_current_user()
    name = self.request.get('name')
    if not user or not name:
      self.error(403)
      return

    slide_set = SlideSet(name=name)
    slide_set.put()
    slide_set_member = SlideSetMember(slide_set=slide_set, user=user)
    slide_set_member.put()

    if self.request.get('next'):
      self.redirect(self.request.get('next'))
    else:
      self.redirect('/set?id=' + str(slide_set.key()))

class ImportSlideSetAction(BaseRequestHandler):
  """ Imports a slideset from a Google presentation."""
  def post(self):
    user = users.get_current_user()
    url = self.request.get('url', 'https://docs.google.com/present/view?id=dggjrx3s_3435z2tmzdg')
    if not user or not url:
      self.error(403)
      return

    # construct URL for embedded presentation
    # URLs should have ?id = in them
    doc_id = url.split('id=')[1]
    embed_url = 'https://docs.google.com/present/embed?id=' + doc_id
    # fetch HTML
    result = urlfetch.fetch(embed_url)
    if result.status_code == 200:
      html = result.content
      # parse to find the JSON
      # need JSON fter initSlideshow
      start = html.find('initSlideshow(') + 14
      end = html.find('protocol') + 12
      json = html[start:end]
      doc_obj = simplejson.loads(json)
      # create slide set
      doc_title = doc_obj['attributes']['title']
      slide_set = SlideSet(name=doc_title)
      slide_set.put()
      slide_set_member = SlideSetMember(slide_set=slide_set, user=user)
      slide_set_member.put()

      slides = doc_obj['children']
      for slide_id, slide_dict in slides.items():
        logging.info(slide_id)
        slide_layout = slide_dict['attributes']['layout']
        # intro section normal
        layout_types = {'LAYOUT_TITLE_SLIDE': 'intro',
                        'LAYOUT_TITLE_BODY_SLIDE': 'normal'}
        slide_type = layout_types.get(slide_layout, 'normal')
        slide_index = slide_dict['index']
        slide = Slide(type=slide_type, index=slide_index, slide_set=slide_set, title='',
                      subtitle='', content='')
        for slide_item_id, slide_item_dict in slide_dict['children'].items():
          logging.info(slide_item_id)
          logging.info(slide_item_dict)
          if 'type' not in slide_item_dict['attributes']: 
            continue
          slide_item_type = slide_item_dict['attributes']['type']
          slide_item_contents = slide_item_dict['attributes']['contents']
          if slide_item_type == 'centeredTitle' or slide_item_type == 'title':
            slide.title = remove_html_tags(slide_item_contents)
          if slide_item_type == 'subtitle':
            slide.subtitle = remove_html_tags(slide_item_contents)
          if slide_item_type == 'body':
            slide.content = remove_divs(slide_item_contents)
          slide.put()

      self.redirect('/list?id=' + str(slide_set.key()))
    # add each slide
    # redirect

class EditSlideAction(BaseRequestHandler):
  """Edits a specific slide, changing its description.

  We also updated the last modified date of the slide set so that the
  slide set inbox shows the correct last modified date for the list.

  This can be used in an AJAX way or in a form. In a form, you should
  supply a "next" argument that denotes the URL we should redirect to
  after the edit is complete.
  """
  def post(self):
    title = self.request.get('title')
    if not title:
      self.error(403)
      return
    type = self.request.get('type')
    subtitle = self.request.get('subtitle')
    content = self.request.get('content')
    index = int(self.request.get('index'))

    # Get the existing slide that we are editing
    slide_key = self.request.get('slide')
    if slide_key:
      slide = Slide.get(slide_key)
      if not slide:
        self.error(403)
        return
      slide_set = slide.slide_set
    else:
      slide = None
      slide_set = SlideSet.get(self.request.get('set'))

    # Validate this user has access to this slide set
    if not slide_set or not slide_set.current_user_has_access():
      self.error(403)
      return

    # Create the slide
    if slide:
      slide.title = title
      slide.subtitle = subtitle
      slide.content = content
      slide.index = index
    else:
      slide = Slide(type=type, title=title, slide_set=slide_set,
                    content=content, index=index, subtitle=subtitle)
    slide.put()

    # Update the slide set so it's updated date is updated. Saving it is all
    # we need to do since that field has auto_now=True
    slide_set.put()

    # Only redirect if "next" is given
    next = self.request.get('next')
    if next:
      self.redirect(next)
    else:
      self.response.headers['Content-Type'] = 'text/plain'
      self.response.out.write(str(slide.key()))


class AddMemberAction(BaseRequestHandler):
  """Adds a new User to a SlideSet ACL."""
  def post(self):
    slide_set = SlideSet.get(self.request.get('list'))
    email = self.request.get('email')
    if not slide_set or not email:
      self.error(403)
      return

    # Validate this user has access to this slide set
    if not slide_set.current_user_has_access():
      self.error(403)
      return

    # Don't duplicate entries in the permissions datastore
    user = users.User(email)
    if not slide_set.user_has_access(user):
      member = SlideSetMember(user=user, slide_set=slide_set)
      member.put()
    self.redirect(self.request.get('next'))


class InboxAction(BaseRequestHandler):
  """Performs an action in the user's SlideSet inbox.

  We support Archive, Unarchive, and Delete actions. The action is specified
  by the "action" argument in the POST. The names are capitalized because
  they correspond to the text in the buttons in the form, which all have the
  name "action".
  """
  def post(self):
    action = self.request.get('action')
    lists = self.request.get('list', allow_multiple=True)
    if not action in ['Delete']:
      self.error(403)
      return

    for key in lists:
      slide_set = SlideSet.get(key)

      # Validate this user has access to this slide set
      if not slide_set or not slide_set.current_user_has_access():
        self.error(403)
        return


      for member in slide_set.slidesetmember_set:
        member.delete()
      for slide in slide_set.slide_set:
        slide.delete()
      slide_set.delete()

    self.redirect(self.request.get('next'))


class SlideSetAction(BaseRequestHandler):
  """Performs an action on a specific slide set.
  by the "action" argument in the POST.
  """
  def post(self):
    action = self.request.get('action')
    slides = self.request.get('slide', allow_multiple=True)
    if not action in ['Delete']:
      self.error(403)
      return

    for key in slides:
      slide = Slide.get(key)

      # Validate this user has access to this slide set
      if not slide or not slide.slide_set.current_user_has_access():
        self.error(403)
        return

      slide.delete()

    self.redirect(self.request.get('next'))


class SetSlidePositionsAction(BaseRequestHandler):
  """Orders the slides in a slide sets.

  The input to this handler is a comma-separated list of slide keys in the
  "slides" argument to the post. We assign index to slides based on that order
  (e.g., 1 through N for N slides).
  """
  def post(self):
    keys = self.request.get('slides').split(',')
    if not keys:
      self.error(403)
      return
    num_keys = len(keys)
    for i, key in enumerate(keys):
      key = keys[i]
      slide = Slide.get(key)
      if not slide or not slide.slide_set.current_user_has_access():
        self.error(403)
        return
      # Index is 1-based
      slide.index = (i + 1)
      slide.put()


class PublishSlideSetAction(BaseRequestHandler):
  """Publishes a given slide set, which makes it viewable by everybody."""
  def post(self):
    slide_set = SlideSet.get(self.request.get('id'))
    if not slide_set or not slide_set.current_user_has_access():
      self.error(403)
      return

    slide_set.published = bool(self.request.get('publish'))
    slide_set.put()

class ChangeThemeAction(BaseRequestHandler):
  """Publishes a given slide set, which makes it viewable by everybody."""

  def post(self):
    slide_set = SlideSet.get(self.request.get('id'))
    if not slide_set or not slide_set.current_user_has_access():
      self.error(403)
      return

    slide_set.theme = self.request.get('theme')
    slide_set.put()


def main():
  application = webapp.WSGIApplication([
      ('/', InboxPage),
      ('/list', SlideSetPage),
      ('/set', SlideSetPage),
      ('/editslide.do', EditSlideAction),
      ('/createslideset.do', CreateSlideSetAction),
      ('/importslideset.do', ImportSlideSetAction),
      ('/addmember.do', AddMemberAction),
      ('/inboxaction.do', InboxAction),
      ('/slideset.do', SlideSetAction),
      ('/publishslideset.do', PublishSlideSetAction),
      ('/changetheme.do', ChangeThemeAction),
      ('/setslidepositions.do', SetSlidePositionsAction)], debug=_DEBUG)
  run_wsgi_app(application)


if __name__ == '__main__':
  main()
