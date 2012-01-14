import datetime, random
from google.appengine.ext import db

SYNC_CODE_EXPIRY = datetime.timedelta(minutes=10)

class Device(db.Model):
    device_id = db.StringProperty()
    sync_code = db.StringProperty()
    sync_code_expiry = db.DateTimeProperty()
    synced = db.BooleanProperty()

def create_device(device_id):
	d = Device(
		key_name = device_id,
		device_id = device_id,
		sync_code = str(random.randint(100000, 999999)),
		sync_code_expiry = datetime.datetime.utcnow() + SYNC_CODE_EXPIRY,
		synced = False
	)
	d.put()
	return d
	
def sync_device(sync_code):
	q = Device.all()
	q.filter("sync_code =", str(sync_code))
	
	device = q.get()
	
	if not device:
		return None
		
	if device.synced:
		return None
	
	device.sync_code = None
	device.synced = True
	device.put()
	
	return device
	