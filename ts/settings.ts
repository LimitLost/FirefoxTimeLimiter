class PageLimitData {
    regex: boolean = false;
    /**
     * In Minutes
     */
    limitTime: number = -1;
    /**
     * In Minutes
     */
    breakTime: number = -1;
}

class PageData {
    minimized: boolean | undefined = false;
    positionX: number | null = null;
    positionY: number | null = null;
    width: number | null = null;
    widthExtended: number | null = null;
    fixTransparency: boolean = false;
}

class PageBreakData {
    lengthMillis: number;
    constructor(lengthMillis: number) {
        this.lengthMillis = lengthMillis;
    }
}


class Settings {

    debugMode: boolean | null = null;



    updateTimerPerMiliseconds: number | null = null;
    animations: boolean | null = null;
    darkMode: boolean | null = null;
    countTimeOnLostFocus: boolean | null = null;
    showCurrentTimeFirefox: boolean | null = null;
    showCurrentTimeWebsite: boolean | null = null;
    breakEndButton: boolean | null = null;
    /**
     * In Seconds
     */
    breakEndDelay: number | null = null;
    /**
     * In Minutes
     */
    firefoxTimeLimit: number | null = null;
    /**
     * In Minutes
     */
    firefoxBreakTime: number | null = null;
    websiteTimeLimit: Map<string, PageLimitData> | null = null;
    transparency: number | null = null;
    backgroundTransparency: number | null = null;
    /**
     * In Hours
     */
    resetTimeCountAfter: number | null = null;

    constructor() {
    }

    async default() {
        this.debugMode = this.debugMode ?? await browser.permissions.contains({ permissions: ["browsingData"] });

        this.updateTimerPerMiliseconds = this.updateTimerPerMiliseconds ?? 100;
        this.animations = this.animations ?? true;
        this.darkMode = this.darkMode ?? false;
        this.countTimeOnLostFocus = this.countTimeOnLostFocus ?? false;
        this.showCurrentTimeFirefox = this.showCurrentTimeFirefox ?? true;
        this.showCurrentTimeWebsite = this.showCurrentTimeWebsite ?? true;
        this.breakEndButton = this.breakEndButton ?? true;
        this.breakEndDelay = this.breakEndDelay ?? 0;
        this.firefoxTimeLimit = this.firefoxTimeLimit ?? -1;
        this.firefoxBreakTime = this.firefoxBreakTime ?? -1;
        this.websiteTimeLimit = this.websiteTimeLimit ?? new Map();
        this.transparency = this.transparency ?? 1;
        this.backgroundTransparency = this.backgroundTransparency ?? 0.8;
        this.resetTimeCountAfter = this.resetTimeCountAfter ?? 6;
    }

    async load() {
        let saved = await browser.storage.local.get([
            "updateTimerPerMiliseconds",
            "animations",
            "darkMode",
            "countTimeOnLostFocus",
            "showCurrentTimeFirefox",
            "showCurrentTimeWebsite",
            "breakEndButton",
            "breakEndDelay",
            "firefoxTimeLimit",
            "websiteTimeLimit",
            "firefoxBreakTime",
            "websiteBreakTime",
            "transparency",
            "backgroundTransparency",
            "resetTimeCountAfter"
        ]);

        this.updateTimerPerMiliseconds = saved["updateTimerPerMiliseconds"];
        this.animations = saved["animations"];
        this.darkMode = saved["darkMode"];
        this.countTimeOnLostFocus = saved["countTimeOnLostFocus"];
        this.showCurrentTimeFirefox = saved["showCurrentTimeFirefox"];
        this.showCurrentTimeWebsite = saved["showCurrentTimeWebsite"];
        this.breakEndButton = saved["breakEndButton"];
        this.breakEndDelay = saved["breakEndDelay"];
        this.firefoxTimeLimit = saved["firefoxTimeLimit"];
        this.firefoxBreakTime = saved["firefoxBreakTime"];
        if (saved["websiteTimeLimit"] != null) {
            this.websiteTimeLimit = new Map(JSON.parse(saved["websiteTimeLimit"]));
        }
        this.transparency = saved["transparency"];
        this.backgroundTransparency = saved["backgroundTransparency"];

        this.resetTimeCountAfter = saved["resetTimeCountAfter"];

        await this.default()
    }

    save() {
        let websiteTimeLimit = JSON.stringify(Array.from(this.websiteTimeLimit!.entries()));
        browser.storage.local.set({
            "updateTimerPerMiliseconds": this.updateTimerPerMiliseconds,
            "animations": this.animations,
            "darkMode": this.darkMode,
            "countTimeOnLostFocus": this.countTimeOnLostFocus,
            "showCurrentTimeFirefox": this.showCurrentTimeFirefox,
            "showCurrentTimeWebsite": this.showCurrentTimeWebsite,
            "breakEndButton": this.breakEndButton,
            "breakEndDelay": this.breakEndDelay,
            "firefoxTimeLimit": this.firefoxTimeLimit,
            "firefoxBreakTime": this.firefoxBreakTime,
            "websiteTimeLimit": websiteTimeLimit,
            "transparency": this.transparency,
            "backgroundTransparency": this.backgroundTransparency,
            "resetTimeCountAfter": this.resetTimeCountAfter
        });

    }
}