class MessageFromBackground {
    //Settings update
    settings: Settings | null = null;

    pageData: PageData | null = null;

    //Time Update
    /**
     * in Milliseconds
     */
    pageTimeUpdate: number | null = null;
    /**
     * in Milliseconds
     */
    firefoxTimeUpdate: number | null = null;
    /**
     * in Milliseconds
     */
    firefoxToBreakTimeLeft: number | null = null;
    /**
     * in Milliseconds
     */
    websiteToBreakTimeLeft: number | null = null;

    break: boolean | null = null;
    /**
     * in Milliseconds
     */
    breakEnd: number | null = null;

    constructor() {
    }
}

class MessageForBackground {
    pageUrl: string;
    pageData: PageData | null = null;
    //Settings update
    settings: Settings | null = null;

    //Button Click
    stopBreak: boolean | null = null;
    resetTimeCountPage: boolean | null = null;
    resetTimeCountFirefox: boolean | null = null;

    constructor(pageUrl: string) {
        this.pageUrl = pageUrl;
    }
}