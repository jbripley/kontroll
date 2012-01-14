var kontroll = {
	beaconKey: null,
	deviceId: null,
	onBeaconMessage: function(data) {
		console.log(data);
	},
	setDeviceId: function(deviceId) {
		kontroll.deviceID = deviceId;
	    Beacon.connect(kontroll.beaconKey, [deviceId]);
	    Beacon.listen(kontroll.onBeaconMessage);
	},
	remote: {
		sync: function(sync_code, callback) {
			$.post("/client/sync", JSON.stringify({"sync_code": sync_code}), function(data){
				kontroll.deviceId = data.device_id;
				callback(data.device_id);
				console.log(data);
			}, "json");
		},
		changePlayState: function(state) {
			$.post("/client/playstate", JSON.stringify({"device_id": spremote.deviceId, "state": state}), function(data){
				console.log("State sent");
			});
		}
	},
}

$(document).ready(function(){
	$("#do_sync").click(function(){
		var deviceId = $("#sync_code").val();
		kontroll.remote.sync(deviceId, function(){
			$("#sync").hide(200, function(){ $("#client").show(200); });
		});
	});
	$("#playstate_play").click(function(){
		kontroll.remote.changePlayState("play");
	});
	
});