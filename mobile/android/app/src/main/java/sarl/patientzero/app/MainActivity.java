package sarl.patientzero.app;

import android.os.Bundle;
import android.view.View;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.BridgeActivity;

/* PATIENT ZERO — 가로 전용 전체 화면.
   내비게이션 바를 그냥 두면 **그 띠가 화면 위에 겹쳐** 오른쪽 위 닫기(×)를 덮는다 —
   테스터가 "X 가 안 눌린다"로 보고했다(2026-10-20). 상태바·내비게이션바를 네이티브에서 감춘다.
   쓸어올리면 잠깐 돌아온다(BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE) — 게임이 삼키지 않으므로
   뒤로가기·홈은 늘 닿는다. 막차 이후가 같은 자리를 같은 방법으로 푼다.
   targetSdk 36(Android 16)부터는 edge-to-edge 가 강제라 setDecorFitsSystemWindows(false) 가 기본이고,
   노치 몫은 게임 쪽 CSS 의 env(safe-area-inset-*) 가 이미 피한다. */
public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        hideBars();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        /* 쓸어올려 띠가 돌아온 뒤, 다시 게임으로 돌아오면 또 감춘다 */
        if (hasFocus) hideBars();
    }

    private void hideBars() {
        View root = getWindow().getDecorView();
        WindowInsetsControllerCompat c = WindowCompat.getInsetsController(getWindow(), root);
        c.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
        c.hide(WindowInsetsCompat.Type.systemBars());
    }
}
