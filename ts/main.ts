
/**
 * Helper variable for creating limiter panel only once
 **/
var first = true;

//From server and for server variables
let page_settings: Settings | null = null
let pageData: PageData | null = null;
/**
 * in Milliseconds
 */
let currentPageLimitCount: number | null = null
/**
 * in Milliseconds
 */
let currentPageBreakTimeLeft: number = -1
/**
 * in Milliseconds
 */
let currentFirefoxLimitCount: number | null = null
/**
 * in Milliseconds
 */
let currentFirefoxBreakTimeLeft: number = -1


// Drag Panel Variables
var isDown = false;
var offset = [0, 0];

//Minimize Variables
var minimized = false;
var oldSizeWidth = "";
var oldSizeHeight = "";

//Variables and checks needed for iframe transparency
var colorSchemeMeta: HTMLMetaElement | null = null;
var colorSchemeMeta2: HTMLMetaElement | null = null;
var metaDarkMode = false;
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', event => {
    metaDarkMode = event.matches;
    if (pageData?.fixTransparency) {
        metaDarkMode = !metaDarkMode
    }
    if (colorSchemeMeta != null) {
        colorSchemeMeta.content = metaDarkMode ? "dark" : "light";
    }
    if (colorSchemeMeta2 != null) {
        colorSchemeMeta2.content = metaDarkMode ? "dark" : "light";
    }
});

var panelDocument: Document | null = null;

let panelContainer: HTMLDivElement | null = null;
var panel: HTMLIFrameElement | null = null;
var content: HTMLFormElement | null = null;
var extendedDivParent: HTMLDivElement | null = null;
var currentTimeOnPage: HTMLTableCellElement | null = null;
var currentTimeOnPageRow: HTMLTableRowElement | null = null;
var currentTimeFirefox: HTMLTableCellElement | null = null;
var currentTimeFirefoxRow: HTMLTableRowElement | null = null;
var currentTimeLeftPage: HTMLTableCellElement | null = null;
var currentTimeLeftPageRow: HTMLTableRowElement | null = null;
var currentTimeLeftFirefox: HTMLTableCellElement | null = null;
var currentTimeLeftFirefoxRow: HTMLTableRowElement | null = null;
var animationsCheckBox: HTMLInputElement | null = null;
var darkModeCheckBox: HTMLInputElement | null = null;
var fixTransparencyCheckBox: HTMLInputElement | null = null;
var showFirefoxTimeCheckBox: HTMLInputElement | null = null;
var showPageTimeCheckBox: HTMLInputElement | null = null;
var transparencySlider: HTMLInputElement | null = null;
var backgroundTransparencySlider: HTMLInputElement | null = null;
var timeUpdateIntervalInput: HTMLInputElement | null = null;
var resetTimeCountAfterInput: HTMLInputElement | null = null;
var timeLimitFirefoxInput: HTMLInputElement | null = null;
var breakTimeFirefoxInput: HTMLInputElement | null = null;
var advancedOptionsLabel: HTMLLabelElement | null = null;
var newPageRuleRow: HTMLTableRowElement | null = null;
var templatePageRuleRow: HTMLTableRowElement | null = null;

var pageRulesResizeObserver: ResizeObserver | null = null;

var breakPanel: HTMLIFrameElement | null = null;
var breakType: BreakType = BreakType.None;
var breakExitTimeout: number | null = null;
var breakTypeSpan: HTMLSpanElement | null = null;
var breakPanelTimeLeft: HTMLSpanElement | null = null;

function updatePanelHeight() {
    if (panel != null) {
        let rect = panelContainer!.getBoundingClientRect()
        let extendedRect = extendedDivParent!.getBoundingClientRect()
        let advancedRect = advancedOptionsLabel!.getBoundingClientRect()

        if (extended) {
            panelContainer!.style.height = rect.height + "px";
            panelContainer!.classList.add("com-limitlost-limiter-transition");
            extendedDivParent!.style.setProperty("height", (advancedRect.top - (extendedRect.top) + advancedRect.height) + "px", "important");
            panelContainer!.style.setProperty("height", (advancedRect.top + advancedRect.height) + "px", "important");
        } else {
            panelContainer!.classList.add("com-limitlost-limiter-transition");
            panelContainer!.style.setProperty("height", (extendedRect.top) + "px", "important");
        }
    }
}

function enterBreak(breakTimeLeft: number) {
    if (breakPanel == null) {
        let old = document.getElementById("com-limitlost-limiter-break-panel")
        //Remove Old Panel If it Already Exists
        if (old != null) {
            old.remove();
        }

        breakPanel = document.createElement("iframe");
        breakPanel.id = "com-limitlost-limiter-break-panel";
        document.body.appendChild(breakPanel);
        if (page_settings?.animations) {
            breakPanel.classList.add("com-limitlost-limiter-animated");
        }

        breakPanel.onload = () => {
            let innerWindow = breakPanel!.contentWindow!
            let innerDocument = innerWindow.document

            //Dark mode meta update
            metaDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches
            if (pageData?.fixTransparency) {
                metaDarkMode = !metaDarkMode
            }
            colorSchemeMeta2 = innerDocument.getElementById("meta-color-scheme") as HTMLMetaElement;
            colorSchemeMeta2.content = metaDarkMode ? "dark" : "light";

            style(innerDocument, "break-internal.css");

            //Break Type Span
            breakTypeSpan = innerDocument.getElementById("break-type") as HTMLSpanElement;
            breakTypeSpan.innerText = breakType == BreakType.Website ? "Website" : "Firefox";
            //Break Time Left Span
            breakPanelTimeLeft = innerDocument.getElementById("break-time-left") as HTMLSpanElement;
            if (breakTimeLeft > 0) {
                breakPanelTimeLeft.innerText = formatDuration(breakTimeLeft);
                breakPanelTimeLeft.parentElement!.style.display = "";
            } else {
                breakPanelTimeLeft.parentElement!.style.display = "none";
            }

            //Stop Break Button
            let stopBreakButton = <HTMLButtonElement>innerDocument.getElementById("stop-break-button")!;
            stopBreakButton.onclick = () => {
                let message = new MessageForBackground();
                message.stopBreak = true;

                browser.runtime.sendMessage(message);
            }

            breakPanel?.style.setProperty("opacity", "1", "important");
        }
        breakPanel.src = browser.runtime.getURL("break-panel.html");
    } else {
        if (breakExitTimeout != null) {
            breakPanel.style.setProperty("opacity", "1", "important");
            clearTimeout(breakExitTimeout);
            breakExitTimeout = null;
        }
        //Update Break Type
        breakTypeSpan!.innerText = breakType == BreakType.Website ? "Website" : "Firefox";
        //Update break time left
        if (breakTimeLeft > 0) {
            breakPanelTimeLeft!.innerText = formatDuration(breakTimeLeft);
            breakPanelTimeLeft!.parentElement!.style.display = "";
        } else {
            breakPanelTimeLeft!.parentElement!.style.display = "none";
        }
    }

}

function exitBreak() {
    if (breakExitTimeout == null && breakPanel != null) {
        breakPanel?.style.setProperty("opacity", "0", "important");
        breakExitTimeout = setTimeout(() => {
            if (breakPanel != null) {
                breakPanel.remove();
                colorSchemeMeta2 = null;
                breakTypeSpan = null;
                breakPanelTimeLeft = null
                breakPanel = null;
            }
            breakExitTimeout = null;
        }, 200);
    }

}

var extended = false;

//Extended Content Variables
var saveButton: HTMLButtonElement | null = null;
function saveNeeded() {
    if (saveButton != null) {
        saveButton.classList.add("save-needed");
    }
}

function saveNotNeeded() {
    if (saveButton != null) {
        saveButton.classList.remove("save-needed");
    }
}

var pageDataTimeout: number | null = null;
function pageDataUpdate() {
    if (pageDataTimeout == null) {
        pageDataTimeout = setTimeout(() => {
            let message = new MessageForBackground();
            message.pageData = pageData;
            browser.runtime.sendMessage(message);
        }, 1000);
    }
}

function applyPageData() {
    if (panel != null && pageData != null) {
        if (extended) {
            panel.style.width = pageData.widthExtended + "px";
            panel.style.height = pageData.heightExtended + "px";
        } else {
            panel.style.width = pageData.width + "px";
            panel.style.height = pageData.height + "px";
        }
        if (pageData.positionX != null) {
            panel.style.left = pageData.positionX + "%"
        }
        if (pageData.positionY != null) {
            panel.style.top = pageData.positionY + "%"
        }
        fixTransparencyCheckBox!.checked = pageData.fixTransparency;
        if (colorSchemeMeta != null) {
            metaDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches
            if (pageData?.fixTransparency) {
                metaDarkMode = !metaDarkMode
            }
            colorSchemeMeta.content = metaDarkMode ? "dark" : "light";
        }

    }
}

function getNewPageName() {
    let currentName = "new Rule";
    let current_i = 1
    while (true) {
        let found = false;
        for (const iterator of templatePageRuleRow!.parentNode!.children!) {
            let el = iterator as HTMLTableRowElement;
            let pageNameI = <HTMLInputElement | null>el.getElementsByClassName("page-name")[0]
            if (pageNameI != null && pageNameI.value == currentName) {
                found = true;
                break;
            }
        }
        if (!found) {
            break;
        } else {
            current_i++;
            currentName = `new Rule ${current_i}`;
        }
    }
    return currentName;

}

function createPageRuleRow(saved: boolean, regex: boolean = false, page_name: string = "", time_limit: number = -1, break_length: number = -1) {
    let newRow = templatePageRuleRow!.cloneNode(true) as HTMLTableRowElement;
    newRow.id = "";
    newRow.classList.add("created-page-rule")


    let removeButton = <HTMLButtonElement>newRow.getElementsByClassName("remove-button")[0]
    let regexButton = <HTMLButtonElement>newRow.getElementsByClassName("regex-button")[0]
    let pageNameInput = <HTMLInputElement>newRow.getElementsByClassName("page-name")[0]
    let pageTimeLimitInput = <HTMLInputElement>newRow.getElementsByClassName("page-time-limit")[0]
    let pageBreakLengthInput = <HTMLInputElement>newRow.getElementsByClassName("page-break-length")[0]
    //Remove Button
    removeButton.onclick = () => {
        page_settings!.websiteTimeLimit!.delete(pageNameInput.value);
        saveNeeded();

        newRow.remove();
    }
    //Regex Button
    if (regex) {
        regexButton.classList.add("active")
    }
    regexButton.onclick = () => {
        let settings = page_settings!.websiteTimeLimit!.get(pageNameInput.value)!
        if (regexButton.classList.contains("active")) {
            settings.regex = false;
            regexButton.classList.remove("active")
        } else {
            settings.regex = true
            regexButton.classList.add("active")
        }
        saveNeeded();
    }
    //Page Name Input
    let currentPageName = page_name
    if (currentPageName == "" && !saved) {
        currentPageName = getNewPageName();
    }

    let textBefore = currentPageName
    pageNameInput.value = currentPageName;
    function updateLocks(name: string, disabled: boolean) {
        let foundDuplicates = []
        for (const iterator of templatePageRuleRow!.parentNode!.children!) {
            let el = iterator as HTMLTableRowElement;
            let pageNameI = <HTMLInputElement | null>el.getElementsByClassName("page-name")[0]
            if (pageNameI != null && pageNameI.value == name) {
                foundDuplicates.push(el);
            }
        }
        let tooMuch = foundDuplicates.length > 1
        if (tooMuch || !disabled) {
            for (const iterator of foundDuplicates) {
                let el = iterator as HTMLTableRowElement;
                (<HTMLButtonElement>el.getElementsByClassName("remove-button")[0]).disabled = disabled;
                (<HTMLButtonElement>el.getElementsByClassName("regex-button")[0]).disabled = disabled;
                (<HTMLInputElement>el.getElementsByClassName("page-time-limit")[0]).disabled = disabled;
                (<HTMLInputElement>el.getElementsByClassName("page-break-length")[0]).disabled = disabled;
                let pageNameI = <HTMLInputElement>el.getElementsByClassName("page-name")[0]
                if (disabled) {
                    pageNameI.classList.add("invalid")
                    pageNameI.setCustomValidity("Duplicate Page Name")
                } else {
                    pageNameI.classList.remove("invalid")
                    pageNameI.setCustomValidity("")
                }
            }

        }
        return tooMuch;
    }
    pageNameInput.onchange = () => {
        removeButton.disabled = false;
        regexButton.disabled = false;
        pageTimeLimitInput.disabled = false;
        pageBreakLengthInput.disabled = false;
        pageNameInput.setCustomValidity("")
        pageNameInput.classList.remove("invalid")

        updateLocks(textBefore, false);
        let tooMuch = updateLocks(pageNameInput.value, true);
        if (!tooMuch) {
            saveNeeded();
            let oldName = newRow.getAttribute("settings-name")!
            newRow.setAttribute("settings-name", pageNameInput.value)
            //Move data from one key to another
            let data = page_settings!.websiteTimeLimit!.get(oldName);
            page_settings!.websiteTimeLimit!.delete(oldName)
            page_settings!.websiteTimeLimit!.set(pageNameInput.value, data!);
        }
        textBefore = pageNameInput.value;
    }
    //Page Time Limit Input
    pageTimeLimitInput.value = time_limit.toString();
    pageTimeLimitInput.onchange = () => {
        saveNeeded();
        //Removing non numeric characters with regex clears entire string for some reason
        let parsed = parseFloat(pageTimeLimitInput!.value);

        if (isNaN(parsed) || !isFinite(parsed)) {
            parsed = 0;
            pageTimeLimitInput!.value = "0";
        }
        page_settings!.websiteTimeLimit!.get(pageNameInput.value)!.limitTime = parsed;
    }
    //Page Break Length Input
    pageBreakLengthInput.value = break_length.toString();
    pageBreakLengthInput.onchange = () => {
        saveNeeded();
        //Removing non numeric characters with regex clears entire string for some reason
        let parsed = parseFloat(pageBreakLengthInput!.value);

        if (isNaN(parsed) || !isFinite(parsed)) {
            parsed = 0;
            pageBreakLengthInput!.value = "0";
        }
        page_settings!.websiteTimeLimit!.get(pageNameInput.value)!.breakTime = parsed;
    }

    newPageRuleRow!.before(newRow);
    if (!saved) {
        saveNeeded();
        let data = new PageLimitData()
        data.regex = regex
        data.limitTime = time_limit
        data.breakTime = break_length;
        page_settings!.websiteTimeLimit!.set(currentPageName, data);
    }
    newRow.setAttribute("settings-name", currentPageName);
    updateLocks(textBefore, true);
}

function applySettings() {
    if (panel != null && page_settings != null) {
        //Animations
        animationsCheckBox!.checked = page_settings.animations!;
        panelContainer!.classList.toggle("com-limitlost-limiter-animated", page_settings.animations!);
        if (breakPanel != null) {
            breakPanel!.classList.toggle("com-limitlost-limiter-animated", page_settings.animations!);
        }
        panelDocument!.body.parentElement!.classList.toggle("no-animations", !page_settings.animations!);
        //Dark Mode
        darkModeCheckBox!.checked = page_settings.darkMode!;
        panelDocument!.body.parentElement!.classList.toggle("dark-mode", page_settings!.darkMode!);
        //Transparency
        transparencySlider!.value = (page_settings.transparency! * 100).toString();
        panelContainer!.style.setProperty("opacity", page_settings.transparency!.toString(), "important");
        //Background Transparency
        backgroundTransparencySlider!.value = (page_settings.backgroundTransparency! * 100).toString();
        panelDocument!.body.parentElement!.style.setProperty("--background-opacity", page_settings.backgroundTransparency!.toString());
        //Show Firefox Time 
        showFirefoxTimeCheckBox!.checked = page_settings.showCurrentTimeFirefox!;
        if (page_settings.showCurrentTimeFirefox!) {
            currentTimeFirefoxRow!.style.display = "";
        } else {
            currentTimeFirefoxRow!.style.display = "none";
        }
        //Show Page Time
        showPageTimeCheckBox!.checked = page_settings.showCurrentTimeWebsite!;
        if (page_settings.showCurrentTimeWebsite!) {
            currentTimeOnPageRow!.style.display = "";
        } else {
            currentTimeOnPageRow!.style.display = "none";
        }
        //Time Update Interval
        timeUpdateIntervalInput!.value = page_settings.updateTimerPerMiliseconds!.toString();
        //Reset Time Count After
        resetTimeCountAfterInput!.value = page_settings.resetTimeCountAfter!.toString();
        //Firefox Time Limit
        timeLimitFirefoxInput!.value = page_settings.firefoxTimeLimit!.toString();
        //Break Time Firefox
        breakTimeFirefoxInput!.value = page_settings.firefoxBreakTime!.toString();
        //Page Rules
        for (const item of newPageRuleRow!.parentElement!.children) {
            if (item.classList.contains("created-page-rule")) {
                item.remove();
            }
        }
        for (const [key, value] of page_settings.websiteTimeLimit!) {
            createPageRuleRow(true, value.regex, key, value.limitTime, value.breakTime);
        }

        saveNotNeeded();
    }
}

function style(doc: Document, css_file_name: string = "internal.css") {
    let style = doc.createElement("link");

    style.rel = "stylesheet"

    style.href = browser.runtime.getURL(css_file_name);

    doc.head.appendChild(style);
}

async function globalStyle() {
    let style = <HTMLLinkElement | null>document.getElementById("com-limitlost-limiter-style");

    if (style != null) {
        return;
    }

    style = document.createElement("link");

    style.id = "com-limitlost-limiter-style"

    style.rel = "stylesheet"

    style.href = browser.runtime.getURL("global.css");

    document.head.appendChild(style);

}
globalStyle()

function formatDuration(millis: number) {
    let currentTime = millis;
    //Tenths of a second
    currentTime = Math.floor(currentTime / 100)
    let secondTenths = currentTime % 10
    //Seconds
    currentTime = Math.floor(currentTime / 10)
    let seconds = currentTime % 60
    //Minutes
    currentTime = Math.floor(currentTime / 60)
    let minutes = currentTime % 60
    //Hours
    currentTime = Math.floor(currentTime / 60)
    let hours = currentTime % 24
    //Days
    currentTime = Math.floor(currentTime / 24)
    let days = currentTime

    //Prefixes
    let secondsPrefix = ""
    if (seconds < 10) {
        secondsPrefix = "0"
    }
    let minutesPrefix = ""
    if (minutes < 10) {
        minutesPrefix = "0"
    }
    //Format
    let formatted = `${minutesPrefix}${minutes}:${secondsPrefix}${seconds}:${secondTenths}`
    if (hours > 0 || days > 0) {
        formatted = `${hours}:${formatted}`
        if (days > 0) {
            formatted = `${days}:${formatted}`
        }
    }
    return formatted
}

function createContent() {
    panelDocument = panel!.contentWindow!.document;

    content = <HTMLFormElement>panelDocument.getElementById("content")!;

    // Current Time On Page
    currentTimeOnPage = <HTMLTableCellElement>panelDocument.getElementById("current-time-on-page")!;
    currentTimeOnPageRow = <HTMLTableRowElement>currentTimeOnPage.parentElement!;

    if (page_settings?.showCurrentTimeWebsite) {
        if (currentPageLimitCount != null) {
            currentTimeOnPage.innerText = formatDuration(currentPageLimitCount);
        } else {
            currentTimeOnPage.innerText = "Limit is not counted on this page";
        }

    } else {
        currentTimeOnPageRow.style.display = "none";
    }

    // Page Time Left Until Break
    currentTimeLeftPage = <HTMLTableCellElement>panelDocument.getElementById("current-time-left-on-page")!;
    currentTimeLeftPageRow = <HTMLTableRowElement>currentTimeLeftPage.parentElement!;

    if (currentPageBreakTimeLeft > 0) {
        currentTimeLeftPage.innerText = formatDuration(currentPageBreakTimeLeft);
    } else {
        currentTimeLeftPageRow.style.display = "none";
    }

    // Current Time In Firefox
    currentTimeFirefox = <HTMLTableCellElement>panelDocument.getElementById("current-time-on-firefox")!;
    currentTimeFirefoxRow = <HTMLTableRowElement>currentTimeFirefox.parentElement!;

    if (page_settings?.showCurrentTimeFirefox && currentFirefoxLimitCount != null) {
        currentTimeFirefox.innerText = formatDuration(currentFirefoxLimitCount);
    } else {
        currentTimeFirefox.parentElement!.style.display = "none";
    }

    // Firefox Time Left Until Break
    currentTimeLeftFirefox = <HTMLTableCellElement>panelDocument.getElementById("current-time-left-on-firefox")!
    currentTimeLeftFirefoxRow = <HTMLTableRowElement>currentTimeLeftFirefox.parentElement!;

    if (currentFirefoxBreakTimeLeft > 0) {
        currentTimeLeftFirefox.innerText = formatDuration(currentFirefoxBreakTimeLeft);
    } else {
        currentTimeLeftFirefoxRow.style.display = "none";
    }

    //Extended Content Variables
    extendedDivParent = <HTMLDivElement>panelDocument.getElementById("extended-content");
    advancedOptionsLabel = <HTMLLabelElement>panelDocument.getElementById("extended-advanced");
    // Extend Button

    let extendButton = panelDocument.getElementById("extend-button")!;

    extendButton.onclick = () => {
        let rect = panelContainer!.getBoundingClientRect()
        let extendedRect = extendedDivParent!.getBoundingClientRect()
        let advancedRect = advancedOptionsLabel!.getBoundingClientRect()
        if (extended) {
            extendButton.innerText = "Extend";
            panelContainer!.classList.add("com-limitlost-limiter-transition");
            panelContainer!.style.setProperty("height", (extendedRect.top) + "px", "important");
            extendedDivParent!.style.setProperty("height", "0px", "important");
            extendedDivParent!.style.setProperty("max-height", "0px", "important");
            extendedDivParent?.scrollTo(0, 0);
        } else {
            panelContainer!.style.height = rect.height + "px";
            extendButton.innerText = "Hide";
            panelContainer!.classList.add("com-limitlost-limiter-transition");
            extendedDivParent!.style.maxHeight = "";
            extendedDivParent!.style.setProperty("height", (advancedRect.top - (extendedRect.top) + advancedRect.height) + "px", "important");
            panelContainer!.style.setProperty("height", (advancedRect.top + advancedRect.height) + "px", "important");
        }
        extended = !extended;
    }

    //Debug: Reload Button
    let reloadButton = panelDocument.getElementById("reload-button")!
    if (page_settings?.debugMode) {
        reloadButton.onclick = () => {
            let message = new MessageForBackground();
            message.debugReload = true;

            browser.runtime.sendMessage(message);
        }
    } else {
        reloadButton.style.display = "none";
    }

    // Save Button
    saveButton = <HTMLButtonElement>panelDocument.getElementById("save-button")!;
    saveButton.onclick = () => {
        if (content!.reportValidity()) {
            saveNotNeeded();

            let message = new MessageForBackground();
            message.settings = page_settings;
            browser.runtime.sendMessage(message);
        }
    }

    // Animations Checkbox
    animationsCheckBox = <HTMLInputElement>panelDocument.getElementById("animations-checkbox")!;
    animationsCheckBox.onchange = () => {
        saveNeeded();
        page_settings!.animations = animationsCheckBox?.checked ?? false;

        panelContainer!.classList.toggle("com-limitlost-limiter-animated", page_settings!.animations!)
        if (breakPanel != null) {
            breakPanel!.classList.toggle("com-limitlost-limiter-animated", page_settings!.animations!)
        }
        panelDocument!.body.parentElement!.classList.toggle("no-animations", !page_settings!.animations!);
    }

    //Dark Mode Checkbox
    darkModeCheckBox = <HTMLInputElement>panelDocument.getElementById("dark-mode-checkbox")!;
    darkModeCheckBox.onchange = () => {
        saveNeeded();
        page_settings!.darkMode = darkModeCheckBox?.checked ?? false;
        panelDocument!.body.parentElement!.classList.toggle("dark-mode", page_settings!.darkMode);
    }
    //Fix Transparency Checkbox
    fixTransparencyCheckBox = <HTMLInputElement>panelDocument.getElementById("fix-transparency-checkbox")!;
    fixTransparencyCheckBox.onchange = () => {
        pageData!.fixTransparency = fixTransparencyCheckBox?.checked ?? false;

        metaDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches
        if (pageData?.fixTransparency) {
            metaDarkMode = !metaDarkMode
        }
        colorSchemeMeta!.content = metaDarkMode ? "dark" : "light";
        if (colorSchemeMeta2 != null) {
            colorSchemeMeta2!.content = metaDarkMode ? "dark" : "light";
        }

        let message = new MessageForBackground();
        message.pageData = pageData;
        browser.runtime.sendMessage(message);
    }
    // Show Firefox Time Checkbox
    showFirefoxTimeCheckBox = <HTMLInputElement>panelDocument.getElementById("show-firefox-time-checkbox")!;
    showFirefoxTimeCheckBox.onchange = () => {
        saveNeeded();
        page_settings!.showCurrentTimeFirefox = showFirefoxTimeCheckBox?.checked ?? false;
        if (page_settings!.showCurrentTimeFirefox) {
            currentTimeFirefoxRow!.style.display = "";
        } else {
            currentTimeFirefoxRow!.style.display = "none";
        }
    }
    //Show Page Time Checkbox
    showPageTimeCheckBox = <HTMLInputElement>panelDocument.getElementById("show-page-time-checkbox")!;
    showPageTimeCheckBox.onchange = () => {
        saveNeeded();
        page_settings!.showCurrentTimeWebsite = showPageTimeCheckBox?.checked ?? false;
        if (page_settings!.showCurrentTimeWebsite) {
            currentTimeOnPageRow!.style.display = "";
        } else {
            currentTimeOnPageRow!.style.display = "none";
        }
    }

    //Reset Time Count After Input
    resetTimeCountAfterInput = <HTMLInputElement>panelDocument.getElementById("reset-time-count-after")!;
    resetTimeCountAfterInput.onblur = () => {
        saveNeeded();
        //Removing non numeric characters with regex clears entire string for some reason
        let parsed = parseFloat(resetTimeCountAfterInput!.value);

        if (isNaN(parsed) || !isFinite(parsed)) {
            parsed = 6;
            resetTimeCountAfterInput!.value = "6";
        }
        page_settings!.resetTimeCountAfter = parsed;
    }

    //Time Limit Firefox Input
    timeLimitFirefoxInput = <HTMLInputElement>panelDocument.getElementById("time-limit-firefox")!;
    timeLimitFirefoxInput.onblur = () => {
        saveNeeded();
        //Removing non numeric characters with regex clears entire string for some reason
        let parsed = parseFloat(timeLimitFirefoxInput!.value);

        if (isNaN(parsed) || !isFinite(parsed)) {
            parsed = 0;
            timeLimitFirefoxInput!.value = "0";
        }
        page_settings!.firefoxTimeLimit = parsed;
    }

    //Break Time Firefox Input
    breakTimeFirefoxInput = <HTMLInputElement>panelDocument.getElementById("break-time-firefox")!;
    breakTimeFirefoxInput.onblur = () => {
        saveNeeded();
        //Removing non numeric characters with regex clears entire string for some reason
        let parsed = parseFloat(breakTimeFirefoxInput!.value);

        if (isNaN(parsed) || !isFinite(parsed)) {
            parsed = 0;
            breakTimeFirefoxInput!.value = "0";
        }
        page_settings!.firefoxBreakTime = parsed;
    }

    //Page Rules Table
    let pageRulesTableParent = panelDocument.getElementById("page-rules-table-parent")!
    newPageRuleRow = <HTMLTableRowElement>panelDocument.getElementById("new-page-rule-row")!;
    templatePageRuleRow = <HTMLTableRowElement>panelDocument.getElementById("page-rule-template")!;

    let newPageRuleButton = panelDocument.getElementById("new-page-rule-button")!;
    pageRulesResizeObserver = new ResizeObserver(() => {
        let rect = pageRulesTableParent.getBoundingClientRect();
        newPageRuleButton.style.width = rect.width + "px";
    })

    pageRulesResizeObserver.observe(pageRulesTableParent)

    //New Page Rule Button
    let rect = pageRulesTableParent.getBoundingClientRect();
    newPageRuleButton.style.width = rect.width + "px";
    newPageRuleButton.onclick = () => {
        createPageRuleRow(false);
    }


    //Reset Time Count On Page Button
    let resetTimeCountOnPageButton = panelDocument.getElementById("reset-page-time")!;
    resetTimeCountOnPageButton.onclick = () => {
        let message = new MessageForBackground(document.URL);
        message.resetTimeCountPage = true;

        browser.runtime.sendMessage(message);
    }


    //Reset Break Time On Firefox Button
    let resetTimeCountOnFirefoxButton = panelDocument.getElementById("reset-firefox-time")!;
    resetTimeCountOnFirefoxButton.onclick = () => {
        let message = new MessageForBackground(document.URL);
        message.resetTimeCountFirefox = true;

        browser.runtime.sendMessage(message);
    }

    //Transparency Slider
    transparencySlider = <HTMLInputElement>panelDocument.getElementById("transparency-slider")!;
    transparencySlider.onchange = () => {
        saveNeeded();
        page_settings!.transparency = parseFloat(transparencySlider!.value) / 100;
        panelContainer!.style.setProperty("opacity", page_settings!.transparency.toString(), "important");
    }
    //Background Transparency Slider
    backgroundTransparencySlider = <HTMLInputElement>panelDocument.getElementById("background-transparency-slider")!;
    backgroundTransparencySlider.onchange = () => {
        saveNeeded();
        page_settings!.backgroundTransparency = parseFloat(backgroundTransparencySlider!.value) / 100;
        panelDocument!.body.parentElement!.style.setProperty("--background-opacity", page_settings!.backgroundTransparency.toString());
    }

    //Time Update Interval
    timeUpdateIntervalInput = <HTMLInputElement>panelDocument.getElementById("time-update-interval")!;
    timeUpdateIntervalInput.onblur = () => {
        saveNeeded();
        //Removing non numeric characters with regex clears entire string for some reason

        let parsed = parseInt(timeUpdateIntervalInput!.value);

        if (isNaN(parsed) || !isFinite(parsed) || parsed < 100) {
            timeUpdateIntervalInput!.value = "100";
            parsed = 100;
        }
        //Max Check
        if (parsed > 60_000) {
            timeUpdateIntervalInput!.value = "60000";
            parsed = 60_000;
        }
        page_settings!.updateTimerPerMiliseconds = parsed;
    }


    applySettings();
    applyPageData();

    let advancedRect = advancedOptionsLabel!.getBoundingClientRect()

    extendedDivParent.style.height = 0 + "px";
    extendedDivParent.style.setProperty("max-height", "0px", "important");
}


async function createPanel() {

    let old = document.getElementById("com-limitlost-limiter-panel-container")
    //Remove Old Panel If it Already Exists
    if (old != null) {
        old.remove();
    }

    panelContainer = document.createElement("div");
    panelContainer.id = "com-limitlost-limiter-panel-container"

    //Add Static limiter panel above everything
    panel = document.createElement("iframe");

    panel.onload = () => {
        let innerWindow = panel!.contentWindow!
        let innerDocument = innerWindow.document

        let iframe_font_size = innerWindow.getComputedStyle(innerDocument.body).getPropertyValue('font-size').match(/\d+/)![0];
        panelContainer?.style.setProperty("--com-limitlost-limiter-font-size", iframe_font_size + "px");

        //Dark mode meta update
        metaDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches
        if (pageData?.fixTransparency) {
            metaDarkMode = !metaDarkMode
        }
        colorSchemeMeta = innerDocument.getElementById("meta-color-scheme") as HTMLMetaElement;
        colorSchemeMeta.content = metaDarkMode ? "dark" : "light";

        style(innerDocument);

        let topBar = innerDocument.getElementById("top-bar")!;

        //Drag Panel Events
        topBar.addEventListener('mousedown', function (e) {
            if (e.button != 0) {
                return;
            }
            isDown = true;
            offset = [
                panelContainer!.offsetLeft - e.screenX,
                panelContainer!.offsetTop - e.screenY
            ];
        }, true);

        function mouseUp() {
            isDown = false;
        }

        function mouseMove(event: MouseEvent) {
            if (isDown) {

                let leftOffsetPx = event.screenX + offset[0];
                let topOffsetPx = event.screenY + offset[1];

                let leftOffset;
                //Left Bounds check
                if (leftOffsetPx + panel!.offsetWidth > window.innerWidth) {
                    leftOffset = (window.innerWidth - panelContainer!.offsetWidth) / window.innerWidth * 100
                } else if (leftOffsetPx < 0) {
                    leftOffset = 0
                } else {
                    leftOffset = leftOffsetPx / window.innerWidth * 100
                }


                let topOffset;
                //Top bounds check
                if (topOffsetPx + panelContainer!.offsetHeight > window.innerHeight) {
                    topOffsetPx = (window.innerHeight - panelContainer!.offsetHeight) / window.innerHeight * 100
                } else if (topOffsetPx < 0) {
                    topOffset = 0
                } else {
                    topOffset = topOffsetPx / window.innerHeight * 100
                }


                panelContainer!.style.setProperty("left", leftOffset + '%', "important");
                panelContainer!.style.setProperty("top", topOffset + '%', "important");
            }
        }

        document.addEventListener('mouseup', mouseUp, true);

        innerDocument.addEventListener('mouseup', function () {
            isDown = false;
        }, true);

        innerDocument.addEventListener('mousemove', mouseMove, true);

        let topBarButton = innerDocument.getElementById("top-bar-button")!;
        topBarButton.onclick = function () {
            if (!minimized) {
                if (panelContainer!.style.width == "") {
                    panelContainer!.style.setProperty("width", innerWindow.innerWidth + "px", "important");
                }
                if (panelContainer!.style.height == "") {
                    panelContainer!.style.setProperty("height", innerWindow.innerHeight + "px", "important");
                }
                panelContainer!.classList.add("com-limitlost-limiter-transition");
                oldSizeWidth = panelContainer!.style.width;
                oldSizeHeight = panelContainer!.style.height;
                panelContainer!.style.setProperty("width", "0px", "important");
                panelContainer!.style.setProperty("height", "0px", "important");
                panelContainer!.style.setProperty("resize", "none", "important");
            } else {
                panelContainer!.classList.add("com-limitlost-limiter-transition");
                panelContainer!.style.setProperty("width", oldSizeWidth, "important");
                panelContainer!.style.setProperty("height", oldSizeHeight, "important");
                panelContainer!.style.resize = "";
            }


            minimized = !minimized
        }

        createContent();

        let rect = panelContainer!.getBoundingClientRect()
        let extendedRect = extendedDivParent!.getBoundingClientRect()

        panelContainer!.style.setProperty("left", `calc(90% - ${panel!.clientWidth}px)`, "important");
        panelContainer!.style.setProperty("height", (rect.height - extendedRect.height) + "px", "important");
        panelContainer!.style.setProperty("width", `${innerWindow.innerWidth}px`, "important");
    }

    panelContainer.appendChild(panel);
    document.body.appendChild(panelContainer);

    panel.src = browser.runtime.getURL("panel.html");

    panel.id = "com-limitlost-limiter-panel";

    //Remove transition class when resizing
    panelContainer.addEventListener('mousedown', function (e) {
        if (e.target == panelContainer) {
            panelContainer!.classList.remove("com-limitlost-limiter-transition")
        }
    });

}

function messageListener(m: any, sender: browser.runtime.MessageSender, sendResponse: ((response?: any) => boolean | void | Promise<any>)) {

    let message = <MessageFromBackground>m;
    if (message.settings != null) {
        page_settings = message.settings;
        applySettings();
    }
    if (message.pageData != null) {
        pageData = message.pageData
        applyPageData();
    }
    if (message.pageTimeUpdate != null) {
        currentPageLimitCount = message.pageTimeUpdate;
        if (currentTimeOnPage != null) {
            currentTimeOnPage.innerText = formatDuration(currentPageLimitCount);
        }
    }
    if (message.firefoxTimeUpdate != null) {
        currentFirefoxLimitCount = message.firefoxTimeUpdate;
        if (currentTimeFirefox != null) {
            currentTimeFirefox.innerText = formatDuration(currentFirefoxLimitCount);
        }
    }
    if (message.websiteToBreakTimeLeft != null) {
        if (currentPageBreakTimeLeft < 0 && message.websiteToBreakTimeLeft > 0 && currentTimeLeftPage != null) {
            //Unhide Time Left To Break
            currentTimeLeftPage.parentElement!.style.display = "";
            updatePanelHeight();
        }
        currentPageBreakTimeLeft = message.websiteToBreakTimeLeft;
        if (currentTimeLeftPage != null) {
            if (currentPageBreakTimeLeft < 0) {
                //Hide Time Left To Break
                currentTimeLeftPage.parentElement!.style.display = "none";
                updatePanelHeight();
            }
            currentTimeLeftPage.innerText = formatDuration(currentPageBreakTimeLeft);
        }
    }
    if (message.firefoxToBreakTimeLeft != null) {
        if (currentFirefoxBreakTimeLeft < 0 && message.firefoxToBreakTimeLeft > 0 && currentTimeLeftFirefox != null) {
            //Unhide Time Left To Break
            currentTimeLeftFirefox.parentElement!.style.display = "";
            updatePanelHeight();
        }
        currentFirefoxBreakTimeLeft = message.firefoxToBreakTimeLeft;
        if (currentTimeLeftFirefox != null) {
            if (currentFirefoxBreakTimeLeft < 0) {
                //Hide Time Left To Break
                currentTimeLeftFirefox.parentElement!.style.display = "none";
                updatePanelHeight();
            }
            currentTimeLeftFirefox.innerText = formatDuration(currentFirefoxBreakTimeLeft);
        }
    }

    if (message.alert) {
        alert(message.alert)
    }

    if (message.break != null) {
        breakType = message.break;
        if (breakType == BreakType.None) {
            exitBreak();
        } else {
            enterBreak(message.breakTimeLeft!);
        }
    }

    if (first && page_settings != null) {
        createPanel();
        first = false;
    } else if (first) {
        //Panel wasn't initialized yet but the messages are received
        let message = new MessageForBackground();
        message.initializationRequest = true;
        browser.runtime.sendMessage(message);
    }

}

browser.runtime.onMessage.addListener(messageListener)