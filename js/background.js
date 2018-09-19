var currentVideoCache = null;
var currentTrackNumCache = null;
var currentTimeCache = null;
var pausedCache = null;
var tracklistCache = null;
var currentTrackStartTime = null;
var currentTrackDuration = null;
var trackProgressBarElement = null;
var trackProgressBarElement2 = null;
var currentKeyboardShortcutsListener = null;
var trackedTabId = null;
var trackedTabUrl = null;
var injectableUrlRegex = /youtube.com\/watch/gi;

function setTrackedTab(newTrackTab) {
  trackedTabId = newTrackTab.id;
  trackedTabUrl = newTrackTab.url;
  purgeCache();
  activateKeyboardShortcuts()
}

function purgeCache() {
  currentVideoCache = null;
  currentTrackNumCache = null;
  currentTimeCache = null;
  pausedCache = null;
  tracklistCache = null;
  currentTrackStartTime = null;
  currentTrackDuration = null;
  trackProgressBarElement = null;
  trackProgressBarElement2 = null;
}

// Reset the keyboard shortcuts and activate them for the given tab
function activateKeyboardShortcuts() {
  if (currentKeyboardShortcutsListener) {
    chrome.commands.onCommand.removeListener(currentKeyboardShortcutsListener);
  }
  currentKeyboardShortcutsListener = function(command) {
    switch (command) {
      case "cmd_play_pause":
        chrome.tabs.sendMessage(trackedTabId, "playOrPause");
        break;
      case "cmd_previous_track":
        chrome.tabs.sendMessage(trackedTabId, "previousTrack");
        break;
      case "cmd_next_track":
        chrome.tabs.sendMessage(trackedTabId, "nextTrack");
        break;
    }
  };
  chrome.commands.onCommand.addListener(currentKeyboardShortcutsListener);
}

function playOrPause() {
  chrome.tabs.sendMessage(trackedTabId, "playOrPause");
}
function previousTrack() {
  chrome.tabs.sendMessage(trackedTabId, "previousTrack");
}
function nextTrack() {
  chrome.tabs.sendMessage(trackedTabId, "nextTrack");
}
function rewind() {
  chrome.tabs.sendMessage(trackedTabId, "rewind");
}
function fastForward() {
  chrome.tabs.sendMessage(trackedTabId, "fastForward");
}
function goToTrack(trackIdx) {
  chrome.tabs.sendMessage(trackedTabId, "goToTrack" + trackIdx);
}

function refreshCurrentVideo(currentVideoLabel, currentTrackLabel, noTrackLabel) {
  chrome.tabs.sendMessage(trackedTabId, "getCurrentVideo", function (response) {
    if (currentVideoCache !== null && currentVideoCache === response) {
      return;
    }
    currentVideoCache = response;

    if (response) {
      currentVideoLabel.textContent = response;
      currentTrackLabel.display = "block";
      refreshCurrentTrack(trackedTabId, currentVideoLabel, currentTrackLabel, noTrackLabel)
    } else {
      currentVideoLabel.textContent = chrome.i18n.getMessage("noVideo");
      currentTrackLabel.setAttribute("style", "display: none");
      noTrackLabel.setAttribute("style", "display: none");
    }
  });
}

function refreshCurrentTrack(currentVideoLabel, currentTrackLabel, noTrackLabel, playlistTable, document) {
  chrome.tabs.sendMessage(trackedTabId, "getCurrentTrackNum", function (response) {
    if (tracklistCache === null || (currentTrackNumCache !== null && currentTrackNumCache === response))
      return;
    currentTrackNumCache = response;

    if (response !== null && response !== undefined) {
      var currentTrackName = tracklistCache[currentTrackNumCache]["title"];
      currentTrackStartTime = tracklistCache[currentTrackNumCache]["startTime"];
      currentTrackDuration = tracklistCache[currentTrackNumCache]["duration"];

      // Update current track label
      currentTrackLabel.setAttribute("style", "display: block");
      currentTrackLabel.textContent = currentTrackName;

      // Remove previously highlighted track in tracklist
      var previousCurrentTrack = playlistTable.querySelector("#currentTrackInPlaylist");
      if (previousCurrentTrack !== null) {
        previousCurrentTrack.removeAttribute("id");
        previousCurrentTrack.removeAttribute("style");
        trackProgressBarElement.remove();
        trackProgressBarElement2.remove();
      }

      // Highlight current track in tracklist and add progress bar
      if (playlistTable.firstChild) {
        var newCurrentTrack = playlistTable.firstChild.childNodes[currentTrackNumCache];
        newCurrentTrack.setAttribute("id", "currentTrackInPlaylist");
        newCurrentTrack.scrollIntoView({behavior: "smooth", block: "center", inline: "center"})
        trackProgressBarElement = playlistTable.insertRow(currentTrackNumCache + 1);
        trackProgressBarElement2 = playlistTable.insertRow(currentTrackNumCache + 2);
        trackProgressBarElement.className = "progressBar";
        trackProgressBarElement2.className = "progressBar";
        var progressBarCell = trackProgressBarElement.insertCell()
        progressBarCell.rowSpan = 2;
        progressBarCell.colSpan = 3;
      }

      // Update other labels
      currentVideoLabel.className = "secondaryTitle";
      noTrackLabel.setAttribute("style", "display: none");
    } else {
      // Hide current track label
      currentTrackLabel.setAttribute("style", "display: none");

      // Update other labels
      currentVideoLabel.className = "primaryTitle";
      noTrackLabel.setAttribute("style", "display: inline");
      noTrackLabel.textContent = chrome.i18n.getMessage("noTracklist");
    }
  });
}

function refreshCurrentTime(currentTimeLabel) {
  chrome.tabs.sendMessage(trackedTabId, "getCurrentTime", function (response) {
    if (response) {
      var seconds = parseInt(response);

      if (currentTimeCache !== null && currentTimeCache === seconds)
        return;
      currentTimeCache = seconds;
      var timeStr = secondsToDisplayTime(seconds);

      // Update the total time in the lower bar
      currentTimeLabel.textContent = "[" + timeStr + "]";
      currentTimeLabel.setAttribute("style", "display: inline-block");

      // Update the progress bar in the tracklist
      if (currentTrackStartTime !== null && currentTrackDuration !== null && trackProgressBarElement !== null) {
        var trackProcess =  (currentTimeCache - currentTrackStartTime) * 100 / currentTrackDuration;
        var styleText = "background: linear-gradient(90deg, rgb(254, 2, 2) " + trackProcess + "%, #CCCCCC 0%);";
        trackProgressBarElement.setAttribute('style', styleText);
      }
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

function refreshPaused(playOrPauseButtonLabel) {
  chrome.tabs.sendMessage(trackedTabId, "getPaused", function (paused) {
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

function refreshTracklist(tracklistTable) {
  chrome.tabs.sendMessage(trackedTabId, "getTracklist", function (tracklist) {
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
          "<td class=\"trackTimeColumn\">" + secondsToDisplayTime(trackInfo["duration"]) + "</td>" +
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

// Inject contentScript into all youtube tabs
function injectScriptIntoAllTabs() {
  chrome.windows.getAll({
    populate: true
  }, function (windows) {
    var i = 0, w = windows.length, currentWindow;
    var tabToTrack = null;
    for( ; i < w; i++ ) {
      currentWindow = windows[i];
      var j = 0, t = currentWindow.tabs.length, currentTab;
      for( ; j < t; j++ ) {
        currentTab = currentWindow.tabs[j];
        // Proceed only with youtube pages
        if(currentTab.url.match(injectableUrlRegex) ) {
          injectScriptIntoTab(currentTab);
          tabToTrack = currentTab;
        }
      }
    }

    // Track the last Youtube video tab detected
    if (tabToTrack) {
      setTrackedTab(tabToTrack);
    }
  });
}

// Inject contentScript into a specific tab
function injectScriptIntoTab(tab) {
  if (!tab.id || !tab.url) {
    return;
  }

  try {
    var scripts = chrome.runtime.getManifest().content_scripts[0].js;
    var i = 0, s = scripts.length;
    for( ; i < s; i++ ) {
      if (tab.url.match(injectableUrlRegex)) {
        chrome.tabs.executeScript(tab.id, {
          file: scripts[i]
        });
      }
    }
  } catch (e) {
    console.log("Unable to inject content script in tab URL " + tab.url + ": " + e)
  }
}

// Inject contentScript on upgrade/install into all youtube tabs
injectScriptIntoAllTabs();