var kontroll = {
	sp: null,
	currentPlaylist: {
		"name": null,
		"playlistUri": null,
		"country": null
	},
	init: function() {
		kontroll.sp = getSpotifyApi(1);
		kontroll.beaconListen(["test"]);		
		var playlists = kontroll.sp.core.library.getPlaylists();
		console.log(playlists);
		kontroll.create.init();
	},
	beaconListen: function(channels) {
	    Beacon.connect('018efdb4', channels, {"log":true, "forceClient": "XhrLongPoll"});
	    Beacon.listen(kontroll.beaconMessage);
		
	},
	beaconMessage: function(data) {
		console.log("Beacon: " + data);
	},
	create: {
		init: function() {
			$("#create_button").click(function(e){
				var name = $("#create_name").val();
				var playlist_uri = $("#create_playlist").val();
				kontroll.create.start(name, playlist_uri)
			});
		},
		start: function (name, playlist_uri) {
			var country_code = kontroll.sp.core.country;
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
	kontroll.init();
});

