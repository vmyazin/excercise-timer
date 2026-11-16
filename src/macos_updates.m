#import <AppKit/AppKit.h>
#include <stdbool.h>
#ifdef ET_SPARKLE
#import <Sparkle/Sparkle.h>
#endif

@interface ETUpdates : NSObject <NSMenuItemValidation
#ifdef ET_SPARKLE
    , SPUUpdaterDelegate
#endif
>
@property(nonatomic) BOOL workoutActive;
#ifdef ET_SPARKLE
@property(nonatomic, strong) SPUStandardUpdaterController *controller;
@property(nonatomic, copy) void (^pendingInstall)(void);
#endif
@end

@implementation ETUpdates
- (void)checkForUpdates:(id)sender {
#ifdef ET_SPARKLE
    [self.controller checkForUpdates:sender];
#else
    NSAlert *alert = [[NSAlert alloc] init];
    alert.messageText = @"Updates are unavailable in this development build";
    alert.informativeText = @"Install a release of Exercise Timer to receive in-app updates.";
    [alert addButtonWithTitle:@"View Releases"];
    [alert addButtonWithTitle:@"Cancel"];
    if ([alert runModal] == NSAlertFirstButtonReturn) {
        [NSWorkspace.sharedWorkspace openURL:[NSURL URLWithString:@"https://github.com/vmyazin/excercise-timer/releases/latest"]];
    }
#endif
}

- (BOOL)validateMenuItem:(NSMenuItem *)item {
#ifdef ET_SPARKLE
    if (item.action == @selector(checkForUpdates:)) {
        return self.controller.updater.canCheckForUpdates;
    }
    if (item.action == @selector(toggleAutomaticChecks:)) {
        item.state = self.controller.updater.automaticallyChecksForUpdates ? NSControlStateValueOn : NSControlStateValueOff;
    }
#endif
    return YES;
}

#ifdef ET_SPARKLE
- (void)toggleAutomaticChecks:(id)sender {
    self.controller.updater.automaticallyChecksForUpdates = !self.controller.updater.automaticallyChecksForUpdates;
}

- (BOOL)updater:(SPUUpdater *)updater shouldPostponeRelaunchForUpdate:(SUAppcastItem *)item untilInvokingBlock:(void (^)(void))installHandler {
    if (!self.workoutActive) return NO;
    self.pendingInstall = installHandler;
    NSAlert *alert = [[NSAlert alloc] init];
    alert.messageText = @"Your update is ready";
    alert.informativeText = @"Exercise Timer will install the update and restart when this workout finishes or you stop it.";
    [alert addButtonWithTitle:@"OK"];
    // A sheet keeps the timer UI and its background clock responsive.
    if (NSApp.mainWindow) [alert beginSheetModalForWindow:NSApp.mainWindow completionHandler:nil];
    return YES;
}
#endif
@end

// AppKit menu targets and Sparkle's delegate are weak references.
static ETUpdates *updates;

void et_updates_initialize(void) {
    NSCAssert(NSThread.isMainThread, @"Updater must initialize on the main thread");
    if (updates) return;
    NSMenu *menu = [NSApp.mainMenu itemAtIndex:0].submenu;
    if (!menu) return;
    updates = [[ETUpdates alloc] init];
#ifdef ET_SPARKLE
    updates.controller = [[SPUStandardUpdaterController alloc] initWithStartingUpdater:NO updaterDelegate:updates userDriverDelegate:nil];
#endif
    NSMenuItem *check = [[NSMenuItem alloc] initWithTitle:@"Check for Updates…" action:@selector(checkForUpdates:) keyEquivalent:@""];
    check.target = updates;
    [menu insertItem:check atIndex:1];
#ifdef ET_SPARKLE
    NSMenuItem *automatic = [[NSMenuItem alloc] initWithTitle:@"Automatically Check for Updates" action:@selector(toggleAutomaticChecks:) keyEquivalent:@""];
    automatic.target = updates;
    [menu insertItem:automatic atIndex:2];
    // Let eframe finish constructing the app before Sparkle presents UI.
    dispatch_async(dispatch_get_main_queue(), ^{
        [updates.controller startUpdater];
    });
#endif
}

bool et_updates_set_workout_active(bool active) {
    NSCAssert(NSThread.isMainThread, @"Updater must run on the main thread");
    updates.workoutActive = active;
#ifdef ET_SPARKLE
    if (!active && updates.pendingInstall) {
        void (^install)(void) = updates.pendingInstall;
        updates.pendingInstall = nil;
        install();
    }
    return updates.pendingInstall != nil;
#else
    return false;
#endif
}
