# Time Limiter for Firefox

[Firefox Add-On Page](https://addons.mozilla.org/pl/firefox/addon/time-limiter/)

Extension for Firefox Web Browser. Monitor And Limit the time you spend on websites and in total. Allows for custom break time.

## Screenshots

<img alt="Default Screnshot" src="/Screenshots/Default.png">
<img alt="Minimized Screnshot" src="/Screenshots/Minimized.png">
<img alt="Extended Screnshot" src="/Screenshots/Extended.png">
<img alt="Dark Mode Screnshot" src="/Screenshots/Dark%20Mode.png">

## Functionality

- Floating Panel
  - Resizeable
  - Moveable
  - Can be minimized by clicking the clock icon (Click it again to unminimize)
  - Time Left Until Break is Automatically shown when Firefox or current page is limited
- Break Panel
  - Does not replace current website
  - Allows to end the break early
- Settings
  - Dark Mode
  - Fix Transparency (Make floating panel transparent if it isn't already)
  - Firefox
    - Set Time Limit
    - Set Break Length
  - Page Rules
    - Click `R` Button to enable page url matching using regex
    - Set Time Limit (In Minutes, set to negative or 0 to disable)
    - Set Break Length (In Minutes, set to negative or 0 to disable)
  - Set Floating Panel Opacity
  - Set Floating Panel Background Opacity
- Advanced Settings
  - Show/Hide Firefox Usage Time
  - Show/Hide Current Website Usage Time
  - Count time while Firefox is unfocused
  - Enable/Disable Animations
  - Show/Hide Early Break End Button
  - Set Early Break End Delay
  - Reset Time Count after selected amount of time while firefox is inactive/unfocused
  - Reset Current Page Time Count Button
  - Reset Firefox Time Count Button
  - Change Time Update Interval

## Development

### Enabling Debug Mode

Add `"browsingData"` permission to the list in [manifest.json](/src/manifest.json)

## License

[MIT](/LICENSE)

Logo: Vectors and icons by [Vlad Cristea](https://www.figma.com/@thevladc?ref=svgrepo.com) in CC Attribution License via [SVG Repo](https://www.svgrepo.com/)
