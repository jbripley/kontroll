#!/usr/bin/env python
#
# Copyright 2007 Google Inc.
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
#
import json, time, os

from google.appengine.ext import webapp
from google.appengine.ext.webapp import util
from google.appengine.ext.webapp import template


from config import get_config
from persistence import create_device, sync_device
from gaesessions import get_current_session
from beaconpush import BeaconPush

CONFIG = get_config()

bp = BeaconPush(api_key=CONFIG["beaconpush"]["key"], secret_key=CONFIG["beaconpush"]["secret"])

class Event(object):
	event = ""
	data = {}
	
	def __init__(self, event, **kwargs):
		self.event = event
		self.data.update(kwargs)
	
def send_event_to_client(device_id, event):
	msg = {
		"recipient": "client",
		"event": event.event,
		"data": event.data
	}
	n = bp.channel_send_message(device_id, msg)

def send_event_to_spapp(device_id, event):
	msg = {
		"recipient": "spapp",
		"event": event.event,
		"data": event.data
	}
	n = bp.channel_send_message(device_id, msg)
	

def render(template_name, data=None):
	if not data:
		data = {}

	session = get_current_session()
	data.update({
		"device_id": session.get("device_id", None)
	})

	template_path = os.path.join(os.path.dirname(__file__), "templates", template_name)
	return template.render(template_path, data)

"""
Spotify:
POST /device/register
>> {"device_id": ...}
<< {"device_id": ..., "sync_code": ..., "sync_code_expiry": ...}

POST /device/playstate
>> {"device_id": ..., "state": ["playing" | "paused" | "stopped" | "ads"], song: ...songinfo...}
<< 

Browser:
GET /
Load client + sync screen

Browser API:
POST /client/sync
>> {"sync_code": ...}
<< {"device_id": ...}

POST /client/playstate
>> {"state": "play"} stop, skip


BP Events:

GAE -> Spotify
{"event": "synced", "data": {}}
{"event": "change_playstate", "data": {"state": "play"}}
{"event": "change_playstate", "data": {"state": "stop"}}
{"event": "change_playstate", "data": {"state": "skip"}}

GAE -> Client
{"event": "playstate", "data": {"state": "paused"}, "song": ...}
{"event": "playstate", "data": {"state": "stopped"}}
{"event": "playstate", "data": {"state": "playing"}, "song": ...}
{"event": "playstate", "data": {"state": "ads"}}

"""

class KontrollRequestHandler(webapp.RequestHandler):
	def write_json(self, data):
		self.response.headers["Content-Type"] = "application/json"
		self.response.out.write(json.dumps(data))

class DeviceRegisterHandler(KontrollRequestHandler):
	def post(self):
		body = json.loads(self.request.body)
		
		d = create_device(body["device_id"])

		response_data = {
			"device_id": d.device_id,
			"sync_code": d.sync_code,
			"sync_code_expiry": int(time.mktime(d.sync_code_expiry.timetuple())*1000) # javascript new Date() friendly
		}
		self.write_json(response_data)
		
class DevicePlaystateHandler(KontrollRequestHandler):
	def post(self):
		body = json.loads(self.request.body)
		device_id = body["device_id"]
		state = body["state"]
		song = None
		if state in ("playing", "paused"):
			song = body["song"]
		
		send_event_to_client(device_id, Event("playstate", state=state, song=song))

class MainHandler(KontrollRequestHandler):
	def get(self):
		data = {
			"beacon_key": CONFIG["beaconpush"]["key"]
		}
		self.response.out.write(render("client.html", data))
		
class ClientSyncHandler(KontrollRequestHandler):
	def post(self):
		body = json.loads(self.request.body)
		
		sync_code = body["sync_code"]
		
		device = sync_device(sync_code)
		
		if not device:
			return self.error(404)
		device_id = device.device_id
		send_event_to_spapp(device_id, Event("synced"))
		
		session = get_current_session()
		session["device_id"] = device_id
		
		response_data = {
			"device_id": device_id
		}
		self.write_json(response_data)

class ClientPlaystateHandler(KontrollRequestHandler):
	def post(self):
		body = json.loads(self.request.body)

		state = body["state"]

		if state not in ("play", "stop", "pause", "skip"):
			return self.error(401)

		session = get_current_session()
		device_id = session.get("device_id")
		if not device_id:
			return self.error(403)

		e = Event("change_playstate", state=state)
		send_event_to_spapp(device_id, e)


def main():
	application = webapp.WSGIApplication(
		[
			('/device/register', 	DeviceRegisterHandler),
			('/device/playstate', 	DevicePlaystateHandler),
			('/client/sync', 		ClientSyncHandler),
			('/client/playstate', 	ClientPlaystateHandler),
			('/', MainHandler)
		], debug=True)
	util.run_wsgi_app(application)


if __name__ == '__main__':
	main()
