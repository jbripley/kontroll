var kontroll = {
    apiEndpoint: "http://spkontroll.appspot.com",
	sp: null,
	models: null,
	views: null,

	init: function() {
	    jQuery.support.cors = true;

		kontroll.sp = getSpotifyApi(1);
		kontroll.models = kontroll.sp.require("sp://import/scripts/api/models");
		kontroll.views = kontroll.sp.require("sp://import/scripts/api/views");

		kontroll.beacon.listen([kontroll.deviceId()]);

		kontroll.models.player.observe(kontroll.models.EVENT.CHANGE, kontroll.player.changed);
		kontroll.player.changed();

		window.addEventListener("storage", kontroll.storage.changed, false);
		kontroll.storage.changed();

		// Handle items dropped'on your icon
		if (kontroll.models.application)
		{
			kontroll.models.application.observe(kontroll.models.EVENT.LINKSCHANGED, kontroll.links.changed);
		}

        // Handle items dropped in the app
        var drop = document.querySelector('#playlist-dnd');
    	drop.addEventListener('dragenter', kontroll.playlistDnd.dragEnter, false);
    	drop.addEventListener('dragover', kontroll.playlistDnd.dragOver, false);
    	drop.addEventListener('dragleave', kontroll.playlistDnd.dragLeave, false);
    	drop.addEventListener('drop', kontroll.playlistDnd.drop, false);
	},

	player: {
	    playstate: {"state": null, "song": {}},
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

	            song["artists"] = [];
	            jQuery.each(kontroll.models.player.track.artists, function(index, artist)
	            {
	               song["artists"].push(artist.name);
	            });
	        }
	        playstate["song"] = song;

	        if (kontroll.player.playstate.state == playstate.state &&
	            kontroll.player.playstate.song.uri == playstate.song.uri)
	        {
	            console.debug("Skip sending playerstate update, same play state and track");
	            console.debug(playstate);
	            return;
	        }

	        kontroll.player.playstate = playstate;

	        kontroll.remote.devicePlaystate(playstate, function()
	        {
	            console.log("Updated playstate");
	            console.log(playstate);
	        });
	    }
	},

	beacon: {
	    listen: function(channels)
		{
	        Beacon.connect('018efdb4', channels, {"log":true, "forceClient": "XhrLongPoll"});
	        Beacon.listen(kontroll.beacon.message);
        },
		
        message: function(eventInfo)
		{
    		if (eventInfo.recipient != "spapp")
    		{
    		    return;
    		}

    		console.debug("Beacon message, event: " + eventInfo.event);
    		switch(eventInfo.event)
    		{
    		    case "synced":
    		    {
    		        kontroll.storage.isSynced(true);
    		        kontroll.sync.hide();
    		    }
    		    break;

    		    case "change_playstate":
    		    {
    		        console.debug("Playstate: " + eventInfo.data.state);
    		        switch(eventInfo.data.state)
    		        {
    		            case "play":
    		                kontroll.models.player.playing = true;
    		                break;

    		            case "pause":
    		                kontroll.models.player.playing = false;
    		                break;

    		            case "next":
    		                kontroll.models.player.next();
    		                break;

    		            case "previous":
    		                kontroll.models.player.previous(false);
    		                break;
    		        }
    		    }
    		    break;

    		    default:
    		    {
    		        console.debug("Unknown event from beacon: " + eventInfo.event);
    		    }
    		}
    	}
	},

	selectedPlaylist:
	{
		show: function(selectedPlaylist)
		{
	        kontroll.storage.selectedPlaylist(selectedPlaylist.uri);

	        var list = new kontroll.views.List(selectedPlaylist);

            jQuery("#playlist-name").replaceWith(selectedPlaylist.name);
            jQuery("#playlist-content").append(list.node);

		    jQuery("#playlist").show();
		},

		hide: function()
		{
		    jQuery("#playlist").hide();
		}
	},

	sync:
	{
	    show: function(syncCode)
	    {
	        jQuery("#api-url").replaceWith(kontroll.apiEndpoint);
	        jQuery("#sync-code").replaceWith(syncCode);
	        jQuery("#sync").show();
	    },

	    hide: function()
	    {
	        jQuery("#sync").hide();
	        kontroll.playlistDnd.show();
	    }
	},
	
	playlistDnd:
	{
	    show: function()
	    {
	        jQuery("#playlist-dnd").show();
	    },

	    hide: function(selectedPlaylist)
	    {
	        jQuery("#playlist-dnd").hide();
	        kontroll.selectedPlaylist.show(selectedPlaylist);
	    },

	    dragEnter: function(e)
	    {
    		this.style.background = '#444444';
    	},

    	dragOver: function(e)
    	{
    		e.preventDefault();
    		e.dataTransfer.dropEffect = 'copy';  // See the section on the DataTransfer object.
    		return false;
    	},

    	dragLeave: function(e)
    	{
    		this.style.background = '#333333';
    	},

    	drop: function(e)
    	{
    		this.style.background = '#333333';
    		var uri = e.dataTransfer.getData('Text');
    		kontroll.models.Playlist.fromURI(uri, function(playlist)
    	    {
    	        kontroll.playlistDnd.hide(playlist);
    	    });
    	}
	},

	storage:
	{
	    changed: function(event)
        {
    	    if (kontroll.storage.isSynced())
    		{
    		    var selectedPlaylist = kontroll.storage.selectedPlaylist();
    		    if (selectedPlaylist != null)
    		    {
    		        kontroll.playlistDnd.hide(selectedPlaylist);
		        }
		        else
		        {
		            kontroll.playlistDnd.show();
		        }
    		}
    		else
    		{
    		    kontroll.remote.deviceRegister(kontroll.deviceId(), function(syncCode)
    		    {
    		        kontroll.sync.show(syncCode);
    		    });
    		}
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
	    },

	    selectedPlaylist: function(playlistUri)
	    {
	        if (playlistUri != undefined)
	        {
	            localStorage.setItem("selectedPlaylist", playlistUri);
	        }
	        else
	        {
	            var playlistUri = localStorage.getItem("selectedPlaylist");
	            if (playlistUri)
	            {
	                var playlist = kontroll.models.Playlist.fromURI(playlistUri);
					return playlist;
	            }
	            else
	            {
	                return null;
	            }
	        }
	    },
		
		deviceId: function(deviceId)
		{
	        if (deviceId != undefined)
	        {
	            localStorage.setItem("deviceId", deviceId);
	        }
	        else
	        {
	            return localStorage.getItem("deviceId");
	        }
		}
	},
	
	links:
	{
	    changed: function()
	    {
        	var links = kontroll.models.application.links;
        	if(links.length)
        	{
        	    var playlistUri = links[0];
        	    kontroll.models.Playlist.fromURI(playlistUri, function(playlist)
        	    {
        	        kontroll.playlistDnd.hide(playlist);
        	    });
        	}
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
	
	deviceId: function()
	{
	    var deviceId = kontroll.storage.deviceId();
		if (deviceId == null)
		{
			if (kontroll.models.session && kontroll.models.session.anonymousUserID)
			{
				deviceId = kontroll.models.session.anonymousUserID	
			}
			else
			{
				// http://stackoverflow.com/questions/105034/how-to-create-a-guid-uuid-in-javascript
				deviceId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
				    var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
				    return v.toString(16);
				});
			}
			
			kontroll.storage.deviceId(deviceId);
		}
		
		return deviceId;
	}
};

$(document).ready(function() {
	kontroll.init();
});

