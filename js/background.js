var currentVideoCache = null;
var currentTrackCache = null;
var currentTimeCache = null;
var pausedCache = null;
var tracklistCache = null;

function purgeCache() {
  currentVideoCache = null;
  currentTrackCache = null;
  currentTimeCache = null;
  pausedCache = null;
  tracklistCache = null;
}

function refreshLabels(tabId, currentVideoLabel, currentTrackLabel, noTrackLabel) {
  chrome.tabs.sendMessage(tabId, "getCurrentVideo", function (response) {
    if (currentVideoCache !== null && currentVideoCache === response) {
      refreshCurrentTrack(tabId, currentVideoLabel, currentTrackLabel, noTrackLabel)
      return;
    }
    currentVideoCache = response;

    if (response) {
      currentVideoLabel.textContent = response;
      currentTrackLabel.display = "block";
      refreshCurrentTrack(tabId, currentVideoLabel, currentTrackLabel, noTrackLabel)
    } else {
      currentVideoLabel.textContent = chrome.i18n.getMessage("noVideo");
      currentTrackLabel.setAttribute("style", "display: none");
      noTrackLabel.setAttribute("style", "display: none");
    }
  });
}

function refreshCurrentTrack(tabId, currentVideoLabel, currentTrackLabel, noTrackLabel) {
  chrome.tabs.sendMessage(tabId, "getCurrentTrack", function (response) {
    if (currentTrackCache !== null && currentTrackCache === response)
      return;
    currentTrackCache = response;

    if (response) {
      currentVideoLabel.className = "secondaryTitle";
      currentTrackLabel.setAttribute("style", "display: block");
      currentTrackLabel.textContent = response;
      noTrackLabel.setAttribute("style", "display: none");
    } else {
      currentVideoLabel.className = "primaryTitle";
      currentTrackLabel.setAttribute("style", "display: none");
      noTrackLabel.setAttribute("style", "display: inline");
      noTrackLabel.textContent = chrome.i18n.getMessage("noTracklist");
    }
  });
}

function refreshCurrentTime(tabId, currentTimeLabel) {
  chrome.tabs.sendMessage(tabId, "getCurrentTime", function (response) {
    if (response) {
      var seconds = parseInt(response);

      if (currentTimeCache !== null && currentTimeCache === seconds)
        return;
      currentTimeCache = seconds;
      var timeStr = secondsToDisplayTime(seconds)

      currentTimeLabel.textContent = "[" + timeStr + "]";
      currentTimeLabel.setAttribute("style", "display: inline-block");
    } else {
      currentTimeLabel.setAttribute("style", "display: none");
    }
  });
}

// Transforms a number of seconds to a printable "xx:xx:xx" string
function secondsToDisplayTime(seconds) {
  var date = new Date(null);
  date.setSeconds(seconds);
  var dateISO = date.toISOString();
  return seconds >= 3600 ? dateISO.substr(11, 8) : dateISO.substr(14, 5);
}

function refreshPaused(tabId, playOrPauseButtonLabel) {
  chrome.tabs.sendMessage(tabId, "getPaused", function (paused) {
    if (pausedCache !== null && pausedCache === paused)
      return;
    pausedCache = paused;

    if (paused) {
      playOrPauseButtonLabel.setAttribute('src', 'img/play.png');
    } else if (paused === false) {
      playOrPauseButtonLabel.setAttribute('src', 'img/pause.png');
    } else {
      playOrPauseButtonLabel.setAttribute('src', 'img/play_pause.png');
    }
  });
}

function refreshTracklist(tabId, tracklistTable) {
  chrome.tabs.sendMessage(tabId, "getTracklist", function (tracklist) {
    if (tracklistCache !== null && JSON.stringify(tracklistCache) === JSON.stringify(tracklist))
      return;
    tracklistCache = tracklist;

    if (tracklist) {
      var tableContent = "<tbody>";
      // tableContent += "<tr><th>N#</th><th>Title</th><th>Time</th></tr>";
      for (var trackIdx in tracklist) {
        var trackInfo = tracklist[trackIdx];
        var trackNum = parseInt(trackIdx) + 1;
        trackNum = (trackNum < 10) ? ("0" + trackNum) : trackNum;
        tableContent += "<tr>" +
          "<td class=\"trackNumColumn\">" + trackNum + "</td>" +
          "<td class=\"trackNameColumn\">" + trackInfo["title"] + "</td>" +
          "<td class=\"trackTimeColumn\">" + secondsToDisplayTime(trackInfo["startTime"]) + "</td>" +
          "</tr>";
      }

      tableContent += "</tbody>";
      tracklistTable.innerHTML = tableContent;
      tracklistTable.setAttribute("style", "display: table");
    } else {
      tracklistTable.setAttribute("style", "display: none");
    }
  });
}

// Inject contentScript on upgrade/install into all youtube tabs
chrome.windows.getAll({
  populate: true
}, function (windows) {
  var i = 0, w = windows.length, currentWindow;
  for( ; i < w; i++ ) {
    currentWindow = windows[i];
    var j = 0, t = currentWindow.tabs.length, currentTab;
    for( ; j < t; j++ ) {
      currentTab = currentWindow.tabs[j];
      // Proceed only with youtube pages
      if(currentTab.url.match(/youtube.com/gi) ) {
        injectIntoTab(currentTab);
      }
    }
  }
});

// Inject contentScript
var injectIntoTab = function (tab) {
  var scripts = chrome.runtime.getManifest().content_scripts[0].js;
  var i = 0, s = scripts.length;
  for( ; i < s; i++ ) {
    chrome.tabs.executeScript(tab.id, {
      file: scripts[i]
    });
  }
}