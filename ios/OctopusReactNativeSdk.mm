#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

@interface RCT_EXTERN_MODULE(OctopusReactNativeSdk, RCTEventEmitter)

RCT_EXTERN_METHOD(initialize:(NSDictionary *)options
                  withResolver:(RCTPromiseResolveBlock)resolve
                  withRejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(openUI:(RCTPromiseResolveBlock)resolve
                  withRejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(closeUI:(RCTPromiseResolveBlock)resolve
                  withRejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(connectUser:(NSDictionary *)params
                  withResolver:(RCTPromiseResolveBlock)resolve
                  withRejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(completeUserTokenRequest:(NSString *)requestId
                  withToken:(NSString *)token
                  withResolver:(RCTPromiseResolveBlock)resolve
                  withRejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(cancelUserTokenRequest:(NSString *)requestId
                  withResolver:(RCTPromiseResolveBlock)resolve
                  withRejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(disconnectUser:(RCTPromiseResolveBlock)resolve
                  withRejecter:(RCTPromiseRejectBlock)reject)

+ (BOOL)requiresMainQueueSetup
{
  return NO;
}

@end
