var kontroll = {
    apiEndpoint: "http://spkontroll.appspot.com",
	sp: null,
	models: null,
	
	init: function() {
	    jQuery.support.cors = true;
	    
		kontroll.sp = getSpotifyApi(1);
		kontroll.models = kontroll.sp.require("sp://import/scripts/api/models");
		
		kontroll.beacon.listen([kontroll.deviceId()]);
		
		window.addEventListener("storage", kontroll.storageChanged(), false);
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
	    }
	},
};

$(document).ready(function() {
	kontroll.init();
});

