#coding: UTF-8
import yaml

def get_config():
	config = {}
	try:
		config = yaml.load(open("config.yaml"))
	except:
		pass
		
	return config
		