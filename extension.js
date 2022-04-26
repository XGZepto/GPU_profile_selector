const Main = imports.ui.main;
const {St, GLib} = imports.gi;
const GObject = imports.gi.GObject;
const Gio = imports.gi.Gio;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const Me = imports.misc.extensionUtils.getCurrentExtension();
const Util = imports.misc.util;

const BLACKLIST_PATH = '/etc/modprobe.d/blacklist-nvidia.conf';
const UDEV_INTEGRATED_PATH = '/lib/udev/rules.d/50-remove-nvidia.rules';
const XORG_PATH = '/etc/X11/xorg.conf';
const MODESET_PATH = '/etc/modprobe.d/nvidia.conf';
const ICON_SIZE = 3;
const ICON_SELECTOR_FILE_NAME = '/icon.svg';


class Extension {
    _getCurrentProfile() {
        // init files needed
        let black_list_file = Gio.File.new_for_path(BLACKLIST_PATH);
        let udev_integrated_file = Gio.File.new_for_path(UDEV_INTEGRATED_PATH);
        let xorg_file = Gio.File.new_for_path(XORG_PATH);
        let modeset_file = Gio.File.new_for_path(MODESET_PATH);

        // check in which mode you are
        if (black_list_file.query_exists(null) && udev_integrated_file.query_exists(null)) {
            return "integrated";
        } else if (xorg_file.query_exists(null) && modeset_file.query_exists(null)) {
            return "nvidia";
        } else {
            return "hybrid";
        }
    }

    enable() {
        this.icon_selector = new St.Icon({
            gicon : Gio.icon_new_for_string(Me.dir.get_path() + ICON_SELECTOR_FILE_NAME),
            style_class : 'system-status-icon',
            icon_size: ICON_SIZE
        });
        
        // get power menu section
        this.power_menu = Main.panel.statusArea['aggregateMenu']._power._item.menu;

        // init integrated GPU profile menu item and its click listener
        this._integrated_menu_item = new PopupMenu.PopupMenuItem('Integrated');
        this._integrated_menu_item_id = this._integrated_menu_item.connect('activate', () => {
            this._hybrid_menu_item.remove_child(this.icon_selector);
            this._nvidia_menu_item.remove_child(this.icon_selector);
            this._integrated_menu_item.add_child(this.icon_selector);
            // exec switch
            Util.spawn(['/bin/bash', '-c', "yes | pkexec envycontrol -s integrated"])
        });

        // init hybrid GPU profile menu item and its click listener
        this._hybrid_menu_item = new PopupMenu.PopupMenuItem('Hybrid');
        this._hybrid_menu_item_id = this._hybrid_menu_item.connect('activate', () => {
            this._integrated_menu_item.remove_child(this.icon_selector);
            this._nvidia_menu_item.remove_child(this.icon_selector);
            this._hybrid_menu_item.add_child(this.icon_selector);
            // exec switch
            Util.spawn(['/bin/bash', '-c', "yes | pkexec envycontrol -s hybrid"])
        });

        // init nvidia GPU profile menu item and its click listener
        this._nvidia_menu_item = new PopupMenu.PopupMenuItem('Nvidia');
        this._nvidia_menu_item_id = this._nvidia_menu_item.connect('activate', () => {
            this._integrated_menu_item.remove_child(this.icon_selector);
            this._hybrid_menu_item.remove_child(this.icon_selector);
            this._nvidia_menu_item.add_child(this.icon_selector);
            // exec switch
            Util.spawn(['/bin/bash', '-c', "yes | pkexec envycontrol -s nvidia"])
        });

        // set icon_selector on current status profile
        let current_profile = this._getCurrentProfile();
        if(current_profile === "integrated") {
            this._hybrid_menu_item.remove_child(this.icon_selector);
            this._nvidia_menu_item.remove_child(this.icon_selector);
            this._integrated_menu_item.add_child(this.icon_selector);
        } else if(current_profile === "nvidia") {
            this._integrated_menu_item.remove_child(this.icon_selector);
            this._hybrid_menu_item.remove_child(this.icon_selector);
            this._nvidia_menu_item.add_child(this.icon_selector);
        } else {
            this._integrated_menu_item.remove_child(this.icon_selector);
            this._nvidia_menu_item.remove_child(this.icon_selector);
            this._hybrid_menu_item.add_child(this.icon_selector);
        }

        // add all menu item to power menu
        this.separator_menu = new PopupMenu.PopupSeparatorMenuItem();
        this.power_menu.addMenuItem(this.separator_menu);
        this.power_menu.addMenuItem(this._integrated_menu_item);
        this.power_menu.addMenuItem(this._hybrid_menu_item);
        this.power_menu.addMenuItem(this._nvidia_menu_item);
    }

    disable() {
        if (this._integrated_menu_item_id) {
            this._integrated_menu_item.disconnect(this._integrated_menu_item_id);
            this._integrated_menu_item_id = 0;
        }
        this._integrated_menu_item.destroy();

        if (this._hybrid_menu_item_id) {
            this._hybrid_menu_item.disconnect(this._hybrid_menu_item_id);
            this._hybrid_menu_item_id = 0;
        }
        this._hybrid_menu_item.destroy();

        if (this._nvidia_menu_item_id) {
            this._nvidia_menu_item.disconnect(this._nvidia_menu_item_id);
            this._nvidia_menu_item_id = 0;
        }
        this._nvidia_menu_item.destroy();

        this.separator_menu.destroy();

        this.icon_selector = null;
    }
}

function init() {
    return new Extension();
}
