package com.movespace.app;

import android.content.Intent;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    /**
     * The SEND intent-filter lives on this Activity and it is launchMode="singleTask", so a share
     * that arrives while the app is already in memory comes through onNewIntent instead of
     * recreating the Activity. Capacitor's BridgeActivity does not call setIntent(), so without
     * this override the send-intent plugin — which reads getActivity().getIntent() — would keep
     * seeing the intent the Activity was created with.
     */
    @Override
    protected void onNewIntent(Intent intent) {
        setIntent(intent);
        super.onNewIntent(intent);

        if (getBridge() != null) {
            getBridge().triggerWindowJSEvent("sendIntentReceived");
        }
    }
}
