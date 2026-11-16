// Native integration checks: use the actual AppKit menu and Sparkle delegate.
#import "../src/macos_updates.m"
#include <assert.h>

int main(void) {
    @autoreleasepool {
        [NSApplication sharedApplication];
        NSMenu *bar = [[NSMenu alloc] init];
        NSMenuItem *appItem = [[NSMenuItem alloc] init];
        NSMenu *menu = [[NSMenu alloc] init];
        [menu addItemWithTitle:@"About Exercise Timer" action:nil keyEquivalent:@""];
        appItem.submenu = menu;
        [bar addItem:appItem];
        NSApp.mainMenu = bar;

        et_updates_initialize();
        assert([[menu itemAtIndex:1].title isEqualToString:@"Check for Updates…"]);
        assert([menu itemAtIndex:1].target == updates);
        assert([menu itemAtIndex:1].action == @selector(checkForUpdates:));
        NSInteger itemCount = menu.numberOfItems;
        et_updates_initialize();
        assert(menu.numberOfItems == itemCount);

#ifdef ET_SPARKLE
        assert([[menu itemAtIndex:2].title isEqualToString:@"Automatically Check for Updates"]);
        __block int installations = 0;
        void (^install)(void) = ^{ installations++; };
        SUAppcastItem *item = [SUAppcastItem emptyAppcastItem];
        assert(!et_updates_set_workout_active(true));
        assert([updates updater:updates.controller.updater shouldPostponeRelaunchForUpdate:item untilInvokingBlock:install]);
        assert(et_updates_set_workout_active(true));
        assert(installations == 0);
        assert(!et_updates_set_workout_active(false));
        assert(installations == 1);
        assert(!et_updates_set_workout_active(false));
        assert(installations == 1);
        assert(![updates updater:updates.controller.updater shouldPostponeRelaunchForUpdate:item untilInvokingBlock:install]);
#else
        assert(!et_updates_set_workout_active(true));
        assert(!et_updates_set_workout_active(false));
#endif
        puts("Native update menu and workout deferral checks passed.");
    }
    return 0;
}
