var kontroll = {
    apiEndpoint: "http://spkontroll.appspot.com",
	sp: null,
	models: null,
	
	init: function() {
	    jQuery.support.cors = true;
	    
		kontroll.sp = getSpotifyApi(1);
		kontroll.models = kontroll.sp.require("sp://import/scripts/api/models");
		
		kontroll.beacon.listen([kontroll.deviceId()]);
		
		kontroll.models.player.observe(kontroll.models.EVENT.CHANGE, kontroll.player.changed);
		kontroll.player.changed();
		
		window.addEventListener("storage", kontroll.storageChanged(), false);
	},
	
	player: {
	    changed: function(event) {
	        // >> {"device_id": ..., "state": ["playing" | "paused" | "stopped" | "ads"], song: {"uri": ..., "artist": ..., "album": ..., "track": ...}}
	        var playstate = {"device_id": kontroll.deviceId()};
	        
	        if (kontroll.models.player.playing === true)
	        {
	            playstate["state"] = "playing";
	        }
	        else
	        {
	            playstate["state"] = "paused";
	        }
	        
	        var song = {};
	        if (kontroll.models.player.track)
	        {
	            song["uri"] = kontroll.models.player.track.uri;
	            song["album"] = kontroll.models.player.track.album.name;
	            song["track"] = kontroll.models.player.track.name;
	            song["image"] = kontroll.models.player.track.image;
	            
	            song["artists"] = [];
	            jQuery.each(kontroll.models.player.track.artists, function(index, artist)
	            {
	               song["artists"].push(artist.name);
	            });
	        }
	        playstate["song"] = song;
	        
	        kontroll.remote.devicePlaystate(playstate, function()
	        {
	            console.log("Updated playstate");
	        });
	    }
	},
	
	beacon: {
	    listen: function(channels) {
	        Beacon.connect('018efdb4', channels, {"log":true, "forceClient": "XhrLongPoll"});
	        Beacon.listen(kontroll.beacon.message);
        },
        message: function(data) {
    		console.log("Beacon: " + data);
    		if (data.recipient != "spapp")
    		{
    		    return;
    		}
    		
    		switch(data.event)
    		{
    		    case "synced":
    		    {
    		        kontroll.sync.isSynced(true);
    		        kontroll.sync.hide();
    		        
    		        kontroll.selectedPlaylist.show();
    		    }
    		    default:
    		    {
    		        console.debug("Unknown event from beacon: " + data.event);
    		    }
    		}
    	}
	},
	
	selectedPlaylist: {
		"name": null,
		"playlistUri": null,
		"country": null,
		
		show: function()
		{
		    jQuery("#playlist").show();
		},
		
		hide: function()
		{
		    jQuery("#playlist").hide();
		}
	},
	
	sync: {
	    show: function(syncCode)
	    {
	        jQuery("#sync-code").replaceWith(syncCode);
	        jQuery("#sync").show();
	    },
	    hide: function()
	    {
	        jQuery("#sync").hide();
	    },
	    isSynced: function(isSynced)
	    {
	        if (isSynced != undefined)
	        {
	            localStorage.setItem("synced", "true");
	        }
	        else
	        {
	            return (localStorage.getItem("synced") === "true");
	        }
	    }
	},
	
	deviceId: function()
	{
	    return kontroll.models.session.anonymousUserID;
	},
	
	storageChanged: function(event)
	{
	    
	    if (kontroll.sync.isSynced())
		{
		    kontroll.selectedPlaylist.show();
		}
		else
		{
		    kontroll.remote.deviceRegister(kontroll.deviceId(), function(syncCode)
		    {
		        kontroll.sync.show(syncCode);
		    });
		}
		
		selectedPlaylist = localStorage.getItem("selectedPlaylist");
		if (selectedPlaylist)
		{
		    kontroll.selectedPlaylist = JSON.parse(selectedPlaylist);
		}
	},
	
	remote:
	{
	    deviceRegister: function(deviceId, callback)
	    {
	        var url = kontroll.apiEndpoint + "/device/register";
	        jQuery.post(url,
	            JSON.stringify({"device_id": deviceId}),
	            function(data, textStatus, jqXHR)
	            {
	                // {"device_id": ..., "sync_code": ..., "sync_code_expiry": ...}
	                return callback(data.sync_code);
	            },
	            "json");
	    },
	    devicePlaystate: function(playstate, callback)
	    {
	        var url = kontroll.apiEndpoint + "/device/playstate";
	        jQuery.post(url,
	            JSON.stringify(playstate),
	            function(data, textStatus, jqXHR)
	            {
	                return callback();
	            },
	            "json");
	    }
	},
};

$(document).ready(function() {
	kontroll.init();
});

