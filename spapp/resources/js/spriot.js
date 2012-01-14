var spriot = {
	sp: null,
	currentSpriot: {
		"name": null,
		"playlistUri": null,
		"password": null,
		"country": null
	},
	init: function() {
		spriot.sp = getSpotifyApi(1);
		spriot.beaconListen(["test"]);		
		var playlists = spriot.sp.core.library.getPlaylists();
		console.log(playlists);
		spriot.create.init();
	},
	beaconListen: function(channels) {
	    Beacon.connect('018efdb4', channels, {"log":true, "forceClient": "XhrLongPoll"});
	    Beacon.listen(spriot.beaconMessage);
		
	},
	beaconMessage: function(data) {
		console.log("Beacon: " + data);
	},
	create: {
		init: function() {
			$("#create_button").click(function(e){
				var name = $("#create_name").val();
				var playlist_uri = $("#create_playlist").val();
				spriot.create.start(name, playlist_uri)
			});
		},
		start: function (name, playlist_uri) {
			var country_code = spriot.sp.core.country;
			console.log("name = " + name);
			console.log("playlist_uri = " + playlist_uri);
			console.log("country_code = " + country_code);
			
		},
	},
	ui: {
		populatePlaylists: function(el, playlists) {
			el.empty();
		},
	}
};

$(document).ready(function() {
	spriot.init();
});

