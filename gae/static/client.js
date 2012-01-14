var kontroll = {
	beaconKey: null,
	deviceId: null,
	currentState: {
		currentSongUri: null,
	},
	onNewSong: function(song) {
		console.log("New song");
		console.log(song);
		$("#song").hide(200, function(){
            if (song == null) return;
             
			$("#song_artist").text(song.artist);
			$("#song_album").text(song.album);
			$("#song_track").text(song.track);
			$("#song").show(200);
		});
	},
	onPlaystateChanged: function(e) {
		console.log("onPlaystateChanged");

		var playstate = e.data.state;
		var verb = {
			"playing": "play",
			"paused": "pause",
			"ads": null, // special case
		}[playstate];
		
		console.log("Playstate from spapp: " + playstate);
		console.log("Playstate verb: " + verb);
		
		$("button.playstate").removeClass("active");
		if (verb != null) {
			$("#playstate_"+verb).addClass("active");
		}
		
		
		var song = null;
		var songUri = null;
		
		if (playstate == "playing" || playstate == "paused") {
    		song = e.data.song;
    		songUri = song.uri;
		}

		if (kontroll.currentState.currentSongUri != songUri) {
			kontroll.currentState.currentSongUri = songUri;
			kontroll.onNewSong(song);
		}
		
	},
	onBeaconMessage: function(e) {
		if (e.recipient != "client") {
			console.log("Ignoring spapp event");
			console.log(e);
			return;
		}
		console.log("Got client event");
		console.log(e);
		if (e.event == "playstate") {
			kontroll.onPlaystateChanged(e);
		}
		
	},
	setDeviceId: function(deviceId) {
		kontroll.deviceID = deviceId;
		console.log("Beacon listen with key " + kontroll.beaconKey);
	    Beacon.connect(kontroll.beaconKey, [deviceId]);
	    Beacon.listen(kontroll.onBeaconMessage);
		console.log("Listening to beacon stuff");
	},
	remote: {
		sync: function(sync_code, callback) {
			$.post("/client/sync", JSON.stringify({"sync_code": sync_code}), function(data){
				kontroll.setDeviceId(data.device_id);
				callback(data.device_id);
				console.log(data);
			}, "json");
		},
		changePlayState: function(state) {
			$.post("/client/playstate", JSON.stringify({"device_id": kontroll.deviceId, "state": state}), function(data){
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
	$("button.playstate").click(function(){
		var stateWanted = $(this).data("playstate");
		console.log(stateWanted);
		kontroll.remote.changePlayState(stateWanted);
	});
	
});