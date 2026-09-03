#import <React/RCTViewManager.h>

@interface RCT_EXTERN_MODULE(OctopusUIViewManager, RCTViewManager)

RCT_EXPORT_VIEW_PROPERTY(interceptUrls, BOOL)
RCT_EXPORT_VIEW_PROPERTY(interceptProfileTaps, BOOL)
RCT_EXPORT_VIEW_PROPERTY(notification, NSDictionary)
RCT_EXPORT_VIEW_PROPERTY(initialScreen, NSDictionary)

// Parity wave — navigation & theme
RCT_EXPORT_VIEW_PROPERTY(showBackButton, BOOL)
RCT_EXPORT_VIEW_PROPERTY(showNavBar, BOOL)
RCT_EXPORT_VIEW_PROPERTY(navBarTitle, NSString)
RCT_EXPORT_VIEW_PROPERTY(navBarPrimaryColor, NSNumber)
RCT_EXPORT_VIEW_PROPERTY(titleCentered, NSNumber)
RCT_EXPORT_VIEW_PROPERTY(navigationMode, NSString)
RCT_EXPORT_VIEW_PROPERTY(navBarLeadingAction, NSString)
RCT_EXPORT_VIEW_PROPERTY(onBackRequested, RCTDirectEventBlock)

@end
