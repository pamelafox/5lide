# Copyright (C) 2009 pdfcrowd.com
# 
# Portions of this code:
#   <http://code.activestate.com/recipes/146306/>
# 
# Permission is hereby granted, free of charge, to any person
# obtaining a copy of this software and associated documentation
# files (the "Software"), to deal in the Software without
# restriction, including without limitation the rights to use,
# copy, modify, merge, publish, distribute, sublicense, and/or sell
# copies of the Software, and to permit persons to whom the
# Software is furnished to do so, subject to the following
# conditions:
# 
# The above copyright notice and this permission notice shall be
# included in all copies or substantial portions of the Software.
# 
# THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
# EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
# OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
# NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
# HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
# WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
# FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
# OTHER DEALINGS IN THE SOFTWARE.

import urllib
import urllib2
import httplib
import mimetypes
import socket


# constants for Client.setPageLayout()
SINGLE_PAGE, CONTINUOUS, CONTINUOUS_FACING = range(1,4)

# constants for Client.setPageMode()
NONE_VISIBLE, THUMBNAILS_VISIBLE, FULLSCREEN = range(1,4)

# constants for setInitialPdfZoomType()
FIT_WIDTH, FIT_HEIGHT, FIT_PAGE = range(1, 4)


class Error(Exception):
    """Thrown when an error occurs."""
    def __init__(self, error, http_code=None):
        self.http_code = http_code
        self.error = error

    def __str__(self):
        if self.http_code:
            return "%d - %s" % (self.http_code, self.error)
        else:
            return self.error


class Client:
    """Pdfcrowd API client."""
    
    def __init__(self, username, api_key):
        """Client constructor.
    
        username -- your username at Pdfcrowd
        api_key  -- your API key
   
        """
        self.useSSL(False)
        self.fields = dict(username=username, key=api_key)

    def convertURI(self, uri, out_stream=None):
        """Converts a web page.
        
        uri        -- a web page URL
        out_stream -- an object having method 'write(data)' - e.g. file,
                      StringIO, etc.; if None then the return value is a string
                      containing the PDF.
        """
        return self.__convert(out_stream, 'uri', uri)

    def convertHtml(self, content, out_stream=None):
        """Converts an in-memory html document.
    
        content    -- a string containing an html document
        out_stream -- an object having method 'write(data)' - e.g. file,
                      StringIO, etc.; if None then the return value is a string
                      containing the PDF.
        """
        return self.__convert(out_stream, 'html', content)

    def convertFile(self, fpath, out_stream=None):
        """Converts an html file.
    
        fpath      -- a path to an html file
        out_stream -- an object having method 'write(data)' - e.g. file,
                      StringIO, etc.; if None then the return value is a string
                      containing the PDF.
        """
        return self.__post_multipart(fpath, out_stream)

    def numTokens(self):
        """Returns the number of available conversion tokens."""
        uri = self.api_uri + 'user/%s/tokens/' % self.fields['username']
        response = self.__call_api(uri)
        return int(response)

    def useSSL(self, use_ssl):
        if use_ssl:
            self.port = HTTPS_PORT
            scheme = 'https'
            self.conn_type = httplib.HTTPSConnection
        else:
            self.port = HTTP_PORT
            scheme = 'http'
            self.conn_type = httplib.HTTPConnection
        self.api_uri = '%s://%s:%d%s' % (scheme, HOST, self.port, API_SELECTOR_BASE)

    def setUsername(self, username):
        self.fields['username'] = username

    def setApiKey(self, key):
        self.fields['key'] = key

    def setPageWidth(self, value):
        self.fields['width'] = value

    def setPageHeight(self, value):
        self.fields['height'] = value

    def setPdfName(self, value):
        self.fields['pdf_name'] = value
        
    def setHorizontalMargin(self, value):
        self.fields['hmargin'] = value

    def setVerticalMargin(self, value):
        self.fields['vmargin'] = value

    def setEncrypted(self, val=True):
        self.fields['encrypted'] = val

    def setUserPassword(self, pwd):
        self.fields['user_pwd'] = pwd

    def setOwnerPassword(self, pwd):
        self.fields['owner_pwd'] = pwd

    def setNoPrint(self, val=True):
        self.fields['no_print'] = val

    def setNoModify(self, val=True):
        self.fields['no_modify'] = val

    def setNoCopy(self, val=True):
        self.fields['no_copy'] = val

    def setPageLayout(self, value):
        assert value > 0 and value <= 3
        self.fields['page_layout'] = value

    def setPageMode(self, value):
        assert value > 0 and value <= 3
        self.fields['page_mode'] = value

    def setFooterText(self, value):
        self.fields['footer_text'] = value

    def enableImages(self, value=True):
        self.fields['no_images'] = not value

    def enableBackgrounds(self, value=True):
        self.fields['no_backgrounds'] = not value

    def setHtmlZoom(self, value):
        self.fields['html_zoom'] = value

    def enableJavaScript(self, value=True):
        self.fields['no_javascript'] = not value

    def enableHyperlinks(self, value=True):
        self.fields['no_hyperlinks'] = not value

    def setDefaultTextEncoding(self, value):
        self.fields['text_encoding'] = value

    def usePrintMedia(self, value=True):
        self.fields['use_print_media'] = value

    def setMaxPages(self, value):
        self.fields['max_pages'] = value

    def enablePdfcrowdLogo(self, value=True):
        self.fields['pdfcrowd_logo'] = value

    def setInitialPdfZoomType(self, value):
        assert value>0 and value<=3
        self.fields['initial_pdf_zoom_type'] = value
    
    def setInitialPdfExactZoom(self, value):
        self.fields['initial_pdf_zoom_type'] = 4
        self.fields['initial_pdf_zoom'] = value

    def setAuthor(self, value):
        self.fields['author'] = value

    def setFailOnNon200(self, value):
        self.fields['fail_on_non200'] = value


    # ----------------------------------------------------------------------
    #
    #                       Private stuff
    # 

    def __convert(self, out_stream, method, src):
        uri = self.api_uri + 'pdf/convert/%s/' % method
        return self.__call_api(uri, out_stream, src)

    def __call_api(self, uri, out_stream=None, src=None):
        import logging
        
        data = self.__encode_post_data({'src': src})
        try:
            obj = urllib2.urlopen(uri, data)
            if out_stream:
                out_stream.write(obj.read())
                return out_stream
            else:
                return obj.read()
        except urllib2.HTTPError, why:
            raise Error(why.read(), why.code)
        except urllib2.URLError, why:
            raise Error(why.reason[1])

    def __encode_post_data(self, extra_data={}):
        import logging
        result = extra_data.copy()
        for key, val in self.fields.iteritems():
            if val:
                if type(val) == float:
                    val = str(val).replace(',', '.')
                result[key] = val
                logging.info(result)
        return urllib.urlencode(result)

    def __encode_multipart_post_data(self, filename):
        boundary = '----------ThIs_Is_tHe_bOUnDary_$'
        body = []
        for field, value in self.fields.iteritems():
            if value:
                body.append('--' + boundary)
                body.append('Content-Disposition: form-data; name="%s"' % field)
                body.append('')
                body.append(str(value))
        # filename
        body.append('--' + boundary)
        body.append('Content-Disposition: form-data; name="src"; filename="%s"' % filename)
        mime_type = mimetypes.guess_type(filename)[0] or 'application/octet-stream'
        body.append('Content-Type: ' + mime_type)
        body.append('')
        body.append(open(filename).read())
        # finalize
        body.append('--' + boundary + '--')
        body.append('')
        body = '\r\n'.join(body)
        content_type = 'multipart/form-data; boundary=%s' % boundary
        return content_type, body

    def __post_multipart(self, fpath, out_stream):
        try:
            content_type, body = self.__encode_multipart_post_data(fpath)
            conn = self.conn_type(HOST, self.port)
            conn.putrequest('POST', API_SELECTOR_BASE+'pdf/convert/html/')
            conn.putheader('content-type', content_type)
            conn.putheader('content-length', str(len(body)))
            conn.endheaders()
            conn.send(body)
            response = conn.getresponse()
            if response.status != 200:
                raise Error(response.read(), response.status)
            if out_stream:
                out_stream.write(response.read())
                return out_stream
            else:
                return response.read()
        except socket.gaierror, err:
            raise Error(err[1])



API_SELECTOR_BASE = '/api/'
HOST = 'pdfcrowd.com'
HTTP_PORT = 80
HTTPS_PORT = 443


# ---------------------------------------------------------------------------
#
#                                Test
#

if __name__ == "__main__":
    import sys
    import os

    if len(sys.argv) < 2:
        print "usage: python pdfcrowd.py username api_key [apihost [http-port https-port]]"
        sys.exit(1)

    if len(sys.argv) > 3:
        HOST = sys.argv[3]

    if len(sys.argv) == 6:
        HTTP_PORT = int(sys.argv[4])
        HTTPS_PORT = int(sys.argv[5])

    print "using %s ports %d %d" % (HOST, HTTP_PORT, HTTPS_PORT)

    os.chdir(os.path.dirname(sys.argv[0]))
    test_dir = '../test_files'
    if not os.path.exists(test_dir + '/out'):
        os.makedirs(test_dir + '/out')

    def out_stream(name, use_ssl):
        fname = test_dir + '/out/py_client_%s' % name
        if use_ssl:
            fname = fname + '_ssl'
        return open(fname + '.pdf', 'wb')

    html="<html><body>Uploaded content!</body></html>"
    client = Client(sys.argv[1], sys.argv[2])
    for use_ssl in [False, True]:
        client.useSSL(use_ssl)
        try:
            ntokens = client.numTokens()
            client.convertURI('http://www.jagpdf.org/', out_stream('uri', use_ssl))
            client.convertHtml(html, out_stream('content', use_ssl))
            client.convertFile(test_dir + '/in/simple.html', out_stream('upload', use_ssl))
            client.convertFile(test_dir + '/in/archive.tar.gz', out_stream('archive', use_ssl))
            after_tokens = client.numTokens()
            print 'remaining tokens:', after_tokens
            assert ntokens-4 == after_tokens
        except Error, why:
            print 'FAILED:', why
            sys.exit(1)
    # test individual methods
    tests = (('setPageWidth', -1),
             ('setPageHeight', 500),
             ('setHorizontalMargin', 72),
             ('setVerticalMargin', 72),
             ('setEncrypted', True),
             ('setUserPassword', 'userpwd'),
             ('setOwnerPassword', 'ownerpwd'),
             ('setNoPrint', True),
             ('setNoModify', True),
             ('setNoCopy', True),
             ('setPageLayout', CONTINUOUS),
             ('setPageMode', FULLSCREEN),
             ('setFooterText', '%p/%n | source %u'),
             ('enableImages', False),
             ('enableBackgrounds', False),
             ('setHtmlZoom', 300),
             ('enableJavaScript', False),
             ('enableHyperlinks', False),
             ('setDefaultTextEncoding', 'iso-8859-1'),
             ('usePrintMedia', True),
             ('setMaxPages', 1),
             ('enablePdfcrowdLogo', True),
             ('setInitialPdfZoomType', FIT_PAGE),
             ('setInitialPdfExactZoom', 113),
             ('setAuthor', 'Your Name'))
    try:
        for method, arg in tests:
            client = Client(sys.argv[1], sys.argv[2])
            getattr(client, method)(arg)
            client.convertFile(test_dir + '/in/simple.html', out_stream(method.lower(), False))
    except Error, why:
        print 'FAILED', why
        sys.exit(1)
    # expected failures
    client = Client(sys.argv[1], sys.argv[2])
    try:
        client.setFailOnNon200(True)
        client.convertURI("http://pdfcrowd.com/this/url/does/not/exist/")
        print "FAILED expected an exception"
        sys.exit(1)
    except Error, why:
        pass # expected
