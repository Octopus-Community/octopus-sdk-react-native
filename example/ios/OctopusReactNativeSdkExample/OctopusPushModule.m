#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

@interface RCT_EXTERN_MODULE(OctopusPushModule, RCTEventEmitter)

RCT_EXTERN_METHOD(requestPermissions:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(getInitialNotification:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end

// Sample shell chrome, independent of the SDK's fullscreen controllers.
@interface RCT_EXTERN_MODULE(SampleSystemBars, NSObject)
RCT_EXTERN_METHOD(setStyle:(NSString *)style)
@end
