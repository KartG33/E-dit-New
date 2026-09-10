package com.kartg33.edit.v2;

import android.view.View;
import android.view.WindowManager;
import android.webkit.WebView;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsAnimationCompat;
import java.util.List;
import java.util.Locale;

/** The IME overlays the window; only its occlusion is sent to the editor. */
final class KeyboardOverlay {
    private final MainActivity activity;
    private final WebView webView;
    private boolean animating;
    private String lastPayload = "";

    KeyboardOverlay(MainActivity activity, WebView webView) {
        this.activity = activity;
        this.webView = webView;
    }

    void install() {
        WindowCompat.setDecorFitsSystemWindows(activity.getWindow(), false);
        activity.getWindow().setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_NOTHING);
        View parent = (View) webView.getParent();
        View root = activity.getWindow().getDecorView();
        parent.setPadding(0, 0, 0, 0);
        lastPayload = "";
        ViewCompat.setOnApplyWindowInsetsListener(parent, (view, insets) -> {
            if (!animating) publish(insets);
            // No IME padding and no inset-driven WebView resize. CSS handles system bars.
            return new WindowInsetsCompat.Builder(insets)
                .setInsets(WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout(), Insets.NONE)
                .build();
        });
        ViewCompat.setWindowInsetsAnimationCallback(root,
            new WindowInsetsAnimationCompat.Callback(WindowInsetsAnimationCompat.Callback.DISPATCH_MODE_CONTINUE_ON_SUBTREE) {
                @Override
                public void onPrepare(WindowInsetsAnimationCompat animation) {
                    if ((animation.getTypeMask() & WindowInsetsCompat.Type.ime()) != 0) animating = true;
                }
                @Override
                public WindowInsetsCompat onProgress(WindowInsetsCompat insets, List<WindowInsetsAnimationCompat> animations) {
                    publish(insets);
                    return insets;
                }
                @Override
                public void onEnd(WindowInsetsAnimationCompat animation) {
                    if ((animation.getTypeMask() & WindowInsetsCompat.Type.ime()) == 0) return;
                    animating = false;
                    WindowInsetsCompat insets = ViewCompat.getRootWindowInsets(root);
                    if (insets != null) publish(insets);
                }
            });
        ViewCompat.requestApplyInsets(parent);
        WindowInsetsCompat current = ViewCompat.getRootWindowInsets(root);
        if (current != null) publish(current);
    }

    private void publish(WindowInsetsCompat insets) {
        Insets bars = insets.getInsetsIgnoringVisibility(WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout());
        Insets ime = insets.getInsets(WindowInsetsCompat.Type.ime());
        float density = activity.getResources().getDisplayMetrics().density;
        String payload = String.format(Locale.US,
            "{height:%.2f,visible:%s,top:%.2f,right:%.2f,bottom:%.2f,left:%.2f}",
            ime.bottom / density, insets.isVisible(WindowInsetsCompat.Type.ime()) ? "true" : "false",
            bars.top / density, bars.right / density, bars.bottom / density, bars.left / density);
        if (payload.equals(lastPayload)) return;
        lastPayload = payload;
        webView.evaluateJavascript("(()=>{const d=" + payload + ";window.__editKeyboardInsets=d;"
            + "const s=document.documentElement.style;"
            + "for(const edge of ['top','right','bottom','left'])s.setProperty('--safe-area-inset-'+edge,d[edge]+'px');"
            + "window.dispatchEvent(new CustomEvent('edit-keyboard-insets',{detail:d}));})()", null);
    }
}
