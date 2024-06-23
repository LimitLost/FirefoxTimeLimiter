async function background() {
    var settings = new Settings();
    await settings.load();

    /**
     * Map Values need to be objects, without any nested objects 
     */
    function mapsAreEqual(m1: Map<any, any>, m2: Map<any, any>) {

        if (m1.size != m2.size) {
            return false;
        }

        for (const key of m1.keys()) {
            let m1Obj = m1.get(key)
            let m2Obj = m2.get(key)
            if (m2Obj == null) {
                return false;
            }
            for (const key2 in m1Obj) {
                if (Object.prototype.hasOwnProperty.call(m1Obj, key2)) {
                    type ObjKey = keyof typeof m1Obj;
                    let element = m1Obj[key2 as ObjKey];
                    let element2 = m2Obj[key2 as ObjKey];
                    if (element !== element2) {
                        return false;
                    }
                }
            }
        }

        return true
    }

    var generalPageData: Map<string, PageData> = new Map();

    let saved = await browser.storage.local.get(["generalPageData"]);

    if (saved["generalPageData"] != null) {

        generalPageData = new Map(JSON.parse(saved["generalPageData"]));
    }

    function savePageData() {
        let parsed = JSON.stringify(Array.from(generalPageData.entries()));
        browser.storage.local.set({
            "generalPageData": parsed,
        })
    }

    var firefoxActive = true;

    /**
     * In Milliseconds
     */
    var totalFirefoxUseTime = 0;
    /**
     * In Milliseconds
     */
    var firefoxBreakTimeLeft: number | null = null;
    var totalWebsiteUseTime: Map<string, PageTimeData> = new Map();
    var currentUsed: string | null = null;
    /**
     * In Milliseconds
     */
    var lastTimeUpdate = nowUtcMillis();
    /**
     * In Milliseconds, The Moment when extension was activated
     */
    var startTime = nowUtcMillis();

    function loadTimeData() {
        browser.storage.local.get(["totalWebsiteUseTime",
            "totalFirefoxUseTime", "lastTimeUpdate", "firefoxBreakTimeLeft"]).then((result) => {
                totalWebsiteUseTime = new Map(JSON.parse(result["totalWebsiteUseTime"]))
                totalFirefoxUseTime = result["totalFirefoxUseTime"] ?? 0;
                lastTimeUpdate = result["lastTimeUpdate"] ?? nowUtcMillis();
                firefoxBreakTimeLeft = result["firefoxBreakTimeLeft"] ?? null;
            });
    }
    await loadTimeData();

    function saveTimeData() {
        browser.storage.local.set({
            "totalWebsiteUseTime": JSON.stringify(Array.from(totalWebsiteUseTime.entries())),
            "totalFirefoxUseTime": totalFirefoxUseTime,
            "lastTimeUpdate": lastTimeUpdate,
            "firefoxBreakTimeLeft": firefoxBreakTimeLeft,
        });
    }

    function resetTimeData() {
        totalFirefoxUseTime = 0;
        firefoxBreakTimeLeft = null;
        totalWebsiteUseTime.clear();
        saveTimeData();
    }
    function resetTimeDataCheck(currentTimeMillis: number) {
        if (lastTimeUpdate < currentTimeMillis && settings.resetTimeCountAfter! > 0) {
            let diff = currentTimeMillis - lastTimeUpdate
            //Reset Check
            if (diff > settings.resetTimeCountAfter! * 3600 * 1000) {
                lastTimeUpdate = currentTimeMillis
                resetTimeData();
            }
        }
    }
    resetTimeDataCheck(startTime)



    async function pageCanBeLimited(tabId: number) {
        try {
            //Check can page be edited by extension
            let results = await browser.tabs.executeScript(tabId, {
                code: `document.designMode;`
            });
            // results is an array of results for each frame in the tab
            // We're only interested in the result for the top-level frame
            if (results[0] !== "on") {
                //Page can't be edited
                return false;
            }
        } catch (error) {
            //Error means that page can be edited (missing host permissions error appears)
        }
        return true;
    }
    /**
     * Returns version of the URL saved in the database
     */
    function findUrl(baseUrl: string) {
        let hostname = new URL(baseUrl).hostname;

        for (const iterator of settings.websiteTimeLimit!) {
            let key = iterator[0]
            let value = iterator[1]
            if (value.regex) {
                let regex = new RegExp(key);
                if (regex.test(baseUrl)) {
                    return key;
                }
            } else {
                if (hostname.endsWith(key)) {
                    return key;
                }
            }
        }

        for (const iterator of totalWebsiteUseTime) {
            let key = iterator[0]
            let value = iterator[1]
            if (!value.regex_key) {
                if (hostname.endsWith(key)) {
                    return key
                }
            }
        }
        //database url should be found at this point, but return just in case somehow it wasn't saved yet
        return hostname;
    }

    async function initializePage(tabId: number, hostname: string, url: string) {
        let found = null

        let matchedUrl = false;
        //Milliseconds
        let foundTime = 0;
        let foundBreakTimeLeft: number | null = null;

        for (const iterator of settings.websiteTimeLimit!) {
            let key = iterator[0]
            let value = iterator[1]
            if (value.regex) {
                let regex = new RegExp(key);
                if (regex.test(url)) {
                    found = key;
                    let timeData = totalWebsiteUseTime.get(found);
                    if (timeData == null) {
                        timeData = new PageTimeData(false)
                        timeData.regex_key = true;
                        totalWebsiteUseTime.set(key, timeData)
                    }
                    foundTime = timeData.timeCounted
                    foundBreakTimeLeft = timeData.breakTimeLeft
                    matchedUrl = true;
                    break;
                }
            } else {
                if (hostname.endsWith(key)) {
                    found = key;
                    let timeData = totalWebsiteUseTime.get(found);
                    if (timeData == null) {
                        timeData = new PageTimeData(false)
                        timeData.regex_key = true;
                        totalWebsiteUseTime.set(key, timeData)
                    }
                    foundTime = timeData.timeCounted
                    foundBreakTimeLeft = timeData.breakTimeLeft
                    matchedUrl = true;
                    break;
                }
            }
        }

        if (!matchedUrl) {
            for (const iterator of totalWebsiteUseTime) {
                let key = iterator[0]
                let value = iterator[1]
                if (!value.regex_key) {
                    if (hostname.endsWith(key)) {
                        found = key;
                        foundTime = value.timeCounted
                        foundBreakTimeLeft = value.breakTimeLeft
                        matchedUrl = true;
                        break;
                    }
                }
            }
        }

        if (!matchedUrl) {
            found = hostname
            totalWebsiteUseTime.set(found, new PageTimeData(true));
        }
        currentPage = tabId;
        currentUsed = found

        let message = new MessageFromBackground();
        message.pageTimeUpdate = foundTime;
        message.firefoxTimeUpdate = totalFirefoxUseTime;
        message.pageData = generalPageData.get(hostname) ?? new PageData();

        let breakActive = false;

        if (firefoxBreakTimeLeft != null) {
            message.break = BreakType.Firefox;
            message.breakTimeLeft = firefoxBreakTimeLeft;
            breakActive = true;
        }
        else if (foundBreakTimeLeft != null) {
            message.break = BreakType.Website;
            message.breakTimeLeft = foundBreakTimeLeft;
            breakActive = true;
        }

        if (!breakActive) {
            message.break = BreakType.None;
        }

        message.settings = settings;

        browser.tabs.sendMessage(tabId, message);
    }

    async function pageHandle(tabId: number) {
        let pageData = await browser.tabs.get(tabId);
        let url = pageData.url!
        let hostname = new URL(url).hostname;
        if (hostname == "") {
            currentUsed = null;
            currentPage = null;
            return;
        }
        currentPage = tabId;

        if (pageData.status != "complete") {
            //Page handling will be done after status update
            return;
        }

        initializePage(tabId, hostname, url)
    }
    /**
     * Tab ID
     */
    var currentPage: number | null = null;
    browser.tabs.getCurrent().then(async (tab) => {
        if (tab == null) {
            return;
        }
        if (tab.id == null) {
            return;
        }

        if (!await pageCanBeLimited(tab.id)) {
            return;
        }

        await pageHandle(tab.id)
    })


    function timeUpdate() {
        let now = nowUtcMillis();
        let diff = now - lastTimeUpdate;

        //Firefox Break Update
        if (firefoxBreakTimeLeft != null) {
            lastTimeUpdate = now;
            if (firefoxBreakTimeLeft > 0) {
                firefoxBreakTimeLeft -= diff;
                if (firefoxBreakTimeLeft <= 0) {
                    firefoxBreakTimeLeft = null;
                    totalFirefoxUseTime = 0;
                }
            }
            if (currentUsed != null) {
                let message = new MessageFromBackground();
                if (firefoxBreakTimeLeft != null) {
                    message.break = BreakType.Firefox;
                    message.breakTimeLeft = firefoxBreakTimeLeft;
                } else {
                    message.break = BreakType.None;
                }
                browser.tabs.sendMessage(currentPage!, message);
            }
            return;
        }

        //Website Break Update
        let currentPageBreak = false;
        for (const [key, value] of totalWebsiteUseTime) {
            if (value.breakTimeLeft != null) {
                if (value.breakTimeLeft > 0) {
                    value.breakTimeLeft -= diff;
                    if (value.breakTimeLeft <= 0) {
                        value.breakTimeLeft = null;
                        value.timeCounted = 0;
                    }
                }
                if (currentUsed == key) {
                    let message = new MessageFromBackground();
                    if (value.breakTimeLeft != null) {
                        message.break = BreakType.Website;
                        message.breakTimeLeft = value.breakTimeLeft;
                    } else {
                        message.break = BreakType.None;
                    }
                    browser.tabs.sendMessage(currentPage!, message);
                    currentPageBreak = true;
                }
            }
        }
        if (currentPageBreak) {
            lastTimeUpdate = now;
            return;
        }

        if (!settings.countTimeOnLostFocus && !firefoxActive) {
            lastTimeUpdate = now;
            return;
        }

        if (diff > 3 * 60_000) {
            //Skip potential computer sleep time
            resetTimeDataCheck(now);
            lastTimeUpdate = now;
            return;
        }

        lastTimeUpdate = now;

        if (firefoxActive || settings.countTimeOnLostFocus) {
            totalFirefoxUseTime += diff;

            if (currentUsed != null) {
                let message = new MessageFromBackground();

                //Check For Firefox Time Limit
                if (settings.firefoxTimeLimit! > 0) {
                    let timeLimitMillis = settings.firefoxTimeLimit! * 60_000
                    if (totalFirefoxUseTime > timeLimitMillis) {
                        message.firefoxToBreakTimeLeft = -1;

                        message.break = BreakType.Firefox;
                        if (settings.firefoxBreakTime! > 0) {
                            firefoxBreakTimeLeft = settings.firefoxBreakTime! * 60_000;
                        } else {
                            firefoxBreakTimeLeft = -1;
                        }
                        message.breakTimeLeft = firefoxBreakTimeLeft;
                    } else {
                        message.firefoxToBreakTimeLeft = timeLimitMillis - totalFirefoxUseTime;
                    }
                }

                //Check For Website Time Limit
                let pageLimitData = settings.websiteTimeLimit!.get(currentUsed);
                if (pageLimitData != null) {
                    if (pageLimitData.limitTime > 0) {
                        let timeLimitMillis = pageLimitData.limitTime * 60_000
                        let websiteUseTime = totalWebsiteUseTime.get(currentUsed)!
                        let timeCounted = websiteUseTime.timeCounted ?? 0

                        if (timeCounted > timeLimitMillis) {
                            message.websiteToBreakTimeLeft = -1;

                            message.break = BreakType.Website;
                            if (pageLimitData.breakTime > 0) {
                                websiteUseTime.breakTimeLeft = pageLimitData.breakTime * 60_000;
                            } else {
                                websiteUseTime.breakTimeLeft = -1;
                            }
                            message.breakTimeLeft = websiteUseTime.breakTimeLeft;
                        } else {
                            message.websiteToBreakTimeLeft = timeLimitMillis - timeCounted;
                        }
                    }
                }



                let pageData = totalWebsiteUseTime.get(currentUsed);
                if (pageData != null) {
                    pageData.timeCounted += diff;
                } else {
                    pageData = new PageTimeData(true);
                    pageData.timeCounted = diff;
                    totalWebsiteUseTime.set(currentUsed, pageData);
                }
                message.pageTimeUpdate = pageData.timeCounted;

                message.firefoxTimeUpdate = totalFirefoxUseTime;
                browser.tabs.sendMessage(currentPage!, message);
            }




        }
    }
    var timeUpdateInterval = setInterval(timeUpdate, settings.updateTimerPerMiliseconds!)

    function autoSave() {
        saveTimeData();
    }
    setInterval(autoSave, 1000)

    browser.windows.onFocusChanged.addListener((windowId) => {
        if (windowId == browser.windows.WINDOW_ID_NONE) {
            firefoxActive = false;
        } else {
            resetTimeDataCheck(nowUtcMillis());
            firefoxActive = true;
        }
    })
    //Send update on tab change
    browser.tabs.onActivated.addListener(async (activeInfo) => {

        if (!await pageCanBeLimited(activeInfo.tabId)) {
            return;
        }

        await pageHandle(activeInfo.tabId)
    })
    //Wait for the page load
    browser.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
        if (changeInfo.status == "complete" && (currentPage == tabId || tab.active)) {
            pageHandle(tabId)
        }
    })


    async function handleContentMessage(m: any) {
        let message = <MessageForBackground>m

        if (message.debugReload == true) {
            browser.browsingData.removeCache({ since: 0 });
            browser.tabs.reload(currentPage!);
        }

        if (message.settings != null) {
            if (message.settings.updateTimerPerMiliseconds != settings.updateTimerPerMiliseconds) {
                clearInterval(timeUpdateInterval)
                timeUpdateInterval = setInterval(timeUpdate, message.settings.updateTimerPerMiliseconds!)
            }
            if (currentPage != null) {
                if (message.settings.firefoxTimeLimit != settings.firefoxTimeLimit) {
                    let response = new MessageFromBackground();
                    response.firefoxToBreakTimeLeft = message.settings!.firefoxTimeLimit! * 60_000 - totalFirefoxUseTime;
                    browser.tabs.sendMessage(currentPage, response);
                }
            }
            if (!mapsAreEqual(message.settings.websiteTimeLimit!, settings.websiteTimeLimit!)) {
                //Set non existing (set by hand timing) to auto created
                for (const [key, value] of totalWebsiteUseTime) {
                    if (!message.settings.websiteTimeLimit!.has(key)) {
                        value.auto_created = true;
                    }
                }
                //Collapse Auto Created Values into the hand made ones
                for (const [key, value] of message.settings.websiteTimeLimit!) {
                    for (const [key2, value2] of totalWebsiteUseTime) {
                        if (value2.auto_created) {
                            if (value.regex) {
                                let regex = new RegExp(key);
                                if (regex.test(key2)) {
                                    totalWebsiteUseTime.delete(key2)
                                    let gotten = totalWebsiteUseTime.get(key)
                                    if (gotten == null) {
                                        value2.auto_created = false;
                                        totalWebsiteUseTime.set(key, value2)
                                    } else {
                                        gotten.auto_created = false;
                                        gotten.timeCounted += value2.timeCounted;
                                    }
                                }
                            } else {
                                if (key2.endsWith(key)) {
                                    totalWebsiteUseTime.delete(key2)
                                    let gotten = totalWebsiteUseTime.get(key)
                                    if (gotten == null) {
                                        value2.auto_created = false;
                                        totalWebsiteUseTime.set(key, value2)
                                    } else {
                                        gotten.auto_created = false;
                                        gotten.timeCounted += value2.timeCounted;
                                    }
                                }
                            }
                            if (currentUsed == key2) {
                                //Check if current page matches
                                if (value.regex) {
                                    let regex = new RegExp(key);
                                    if (regex.test(message.pageUrl)) {
                                        currentUsed = key;
                                    }
                                } else {
                                    if (message.pageUrl.endsWith(key)) {
                                        currentUsed = key;
                                    }
                                }
                            }
                        }
                    }
                }
                //Update To Break Time Left On Current Site
                if (currentUsed != null) {
                    let limitData = message.settings.websiteTimeLimit!.get(currentUsed)
                    let response = new MessageFromBackground();
                    if (limitData != null) {
                        let timeData = totalWebsiteUseTime.get(currentUsed)!

                        response.websiteToBreakTimeLeft = limitData!.limitTime * 60_000 - timeData.timeCounted;
                    } else {
                        response.websiteToBreakTimeLeft = -1
                    }

                    browser.tabs.sendMessage(currentPage!, response);
                }
            }

            settings = Object.assign(new Settings(), message.settings);
            settings.save();
        }

        if (message.pageData != null) {
            generalPageData.set(new URL(message.pageUrl).hostname, message.pageData);
            savePageData()
        }

        if (message.initializationRequest == true && currentPage != null) {
            initializePage(currentPage, new URL(message.pageUrl).hostname, message.pageUrl)
        }

        if (message.stopBreak == true) {
            //Firefox Update
            if (firefoxBreakTimeLeft != null) {
                firefoxBreakTimeLeft = null;
                totalFirefoxUseTime = 0;
                if (currentPage != null) {
                    let message = new MessageFromBackground()
                    message.break = BreakType.None;
                    browser.tabs.sendMessage(currentPage!, message)
                }
                saveTimeData();
            }
            //Website Update
            let databaseUrl = findUrl(message.pageUrl);
            let pageData = totalWebsiteUseTime.get(databaseUrl);
            if (pageData != null && pageData.breakTimeLeft != null) {
                pageData.breakTimeLeft = null;
                pageData.timeCounted = 0;
                if (currentUsed == databaseUrl) {
                    let message = new MessageFromBackground()
                    message.break = BreakType.None;
                    browser.tabs.sendMessage(currentPage!, message)
                }
                saveTimeData();
            }
        }

        if (message.resetTimeCountFirefox == true) {
            totalFirefoxUseTime = 0;
            if (firefoxBreakTimeLeft != null) {
                firefoxBreakTimeLeft = null;
                if (currentPage != null) {
                    let message = new MessageFromBackground()
                    message.break = BreakType.None;
                    browser.tabs.sendMessage(currentPage!, message)
                }
            }
            saveTimeData();
        }

        if (message.resetTimeCountPage == true) {
            let pageData = totalWebsiteUseTime.get(currentUsed!)
            if (pageData != null) {
                pageData.timeCounted = 0;
                if (pageData.breakTimeLeft != null) {
                    pageData.breakTimeLeft = null;
                    let message = new MessageFromBackground()
                    message.break = BreakType.None;
                    browser.tabs.sendMessage(currentPage!, message)
                }
            }
            saveTimeData();
        }
    }
    browser.runtime.onMessage.addListener(handleContentMessage);

}
background()
