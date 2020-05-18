// vim:fdm=syntax
// by tuberry@github

const { Gio, GObject } = imports.gi;
const fileUtils = imports.misc.fileUtils;

const Fields = {
    SHELL:       'name',
    THEME:       'gtk-theme',
    ICONS:       'icon-theme',
    DAYORNIGHT:  'day-or-night',
    NIGHTLIGHT:  'night-light-enabled',
    NIGHTCOLOR:  'org.gnome.SettingsDaemon.Color',
    THEMESCHEMA: 'org.gnome.desktop.interface',
    NIGHTSCHEMA: 'org.gnome.settings-daemon.plugins.color',
};

const tgsetting = new Gio.Settings({ schema: Fields.THEMESCHEMA });
const ngsetting = new Gio.Settings({ schema: Fields.NIGHTSCHEMA });
const sgsetting = imports.misc.extensionUtils.getSettings();

const Tweaks = {
    _icons:       'icons',
    _theme:       'theme',
    _icons_night: 'icons-night',
    _theme_night: 'theme-night',
};

var NightThemeSwitch = GObject.registerClass(
class NightThemeSwitch extends GObject.Object {
    _init() {
        super._init();
    }

    _onNightLightChanged() {
        if(!this._proxy || !ngsetting.get_boolean(Fields.NIGHTLIGHT)) return;
        sgsetting.set_boolean(Fields.DAYORNIGHT, this._proxy.NightLightActive);
        if(this._proxy.NightLightActive) {
            let icons = this._icons.indexOf(tgsetting.get_string(Fields.ICONS));
            if(icons > -1 && this._icons_night[icons]) tgsetting.set_string(Fields.ICONS, this._icons_night[icons]);
            let theme = tgsetting.get_string(Fields.THEME);
            let index = this._theme.indexOf(theme);
            if(index < 0) {
                if(this._theme_night.includes(theme)) sgsetting.set_string(Fields.SHELL, theme.includes('Adwaita') ? '' : theme);
            } else {
                if(this._theme_night[index]) {
                    tgsetting.set_string(Fields.THEME, this._theme_night[index]);
                    sgsetting.set_string(Fields.SHELL, this._theme_night[index].includes('Adwaita') ? '' : this._theme_night[index]);
                }
            }
        } else {
            let icons = this._icons_night.indexOf(tgsetting.get_string(Fields.ICONS));
            if(icons > -1 && this._icons[icons]) tgsetting.set_string(Fields.ICONS, this._icons[icons]);
            let theme = tgsetting.get_string(Fields.THEME);
            let index = this._theme_night.indexOf(theme);
            if(index < 0) {
                if(this._theme.includes(theme)) sgsetting.set_string(Fields.SHELL, theme.includes('Adwaita') ? '' : theme);
            } else {
                if(this._theme[index]) {
                    tgsetting.set_string(Fields.THEME, this._theme[index]);
                    sgsetting.set_string(Fields.SHELL, this._theme[index].includes('Adwaita') ? '' : this._theme[index]);
                }
            }
        }
    }

    _loadSettings() {
        const DBusProxy = Gio.DBusProxy.makeProxyWrapper(fileUtils.loadInterfaceXML(Fields.NIGHTCOLOR));
        this._proxy = new DBusProxy(Gio.DBus.session, Fields.NIGHTCOLOR, '/org/gnome/SettingsDaemon/Color');
        if(!this._proxy) throw new Error('Failed to create DBus proxy');
        for(let x in Tweaks) {
            eval(`this.%s = sgsetting.get_string('%s') ? sgsetting.get_string('%s').split('#') : []`.format(x, Tweaks[x], Tweaks[x]));
            eval(`this.%sId = sgsetting.connect('changed::%s', () => { this.%s = sgsetting.get_string('%s') ? sgsetting.get_string('%s').split('#') : [];});`.format(x, Tweaks[x], x, Tweaks[x], Tweaks[x]));
        }
    }

    enable() {
        this._loadSettings();
        this._onNightLightChanged();
        this._proxyChangedId = this._proxy.connect('g-properties-changed', this._onNightLightChanged.bind(this));
        this._themeChangedId = tgsetting.connect(`changed::${Fields.THEME}`, this._onNightLightChanged.bind(this));
        this._iconsChangedId = tgsetting.connect(`changed::${Fields.ICONS}`, this._onNightLightChanged.bind(this));
        this._nightLightOnId = ngsetting.connect(`changed::${Fields.NIGHTLIGHT}`, this._onNightLightChanged.bind(this));
    }

    disable() {
        if(this._nightLightOnId)
            ngsetting.disconnect(this._nightLightOnId), this._nightLightOnId = 0;
        if(this._themeChangedId)
            tgsetting.disconnect(this._themeChangedId), this._themeChangedId = 0;
        if(this._iconsChangedId)
            tgsetting.disconnect(this._iconsChangedId), this._iconsChangedId = 0;
        if(this._proxyChangedId)
            this._proxy.disconnect(this._proxyChangedId), this._proxyChangedId = 0;
        for(let x in Tweaks) {
            eval(`if(this.%sId) sgsetting.disconnect(this.%sId), this.%sId = 0;`.format(x, x, x));
            eval(`this.%s = null`.format(x));
        }
        this._proxy = null;
    }
});

