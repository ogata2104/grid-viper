# Grid Viper

ブラウザで遊べるスネークゲーム（Snake）です。フレームワーク・ビルドツール一切なしの、HTML / CSS / JavaScript（バニラ）のみで実装されています。

**Play: https://ogata2104.github.io/grid-viper/**

## 遊び方

- 矢印キー（↑↓←→）または画面上の方向ボタンで⬛︎を操作します。
- ❤️を食べると尻尾が1マス伸び、スコアが加算されます。
- 一定間隔で💣が盤面に出現します。💣・自分の尻尾・盤面の外に接触するとGAME OVERです。
- スコアが上がるほど移動速度が上がっていきます。
- GAME OVER後は「REPLAY?」ボタンでリスタートできます。

## ローカルでの動作確認

ビルド不要の静的ファイルなので、ローカルHTTPサーバーで配信して `index.html` を開くだけで動作します。

```sh
python3 -m http.server 8080
# ブラウザで http://localhost:8080/index.html を開く
```

`fetch`や`file://`固有の制限は使用していませんが、`index.html`をファイルとして直接ブラウザで開いても動作します。

## デプロイ

`main`ブランチのルートをそのままソースとしてGitHub Pagesで公開しています。`main`にpushすると自動的に反映されます（ビルドステップなし）。

- 公開URL: https://ogata2104.github.io/grid-viper/
- 設定: GitHubリポジトリの Settings → Pages → Source: `Deploy from a branch` / Branch: `main` / `/(root)`

## ファイル構成

| ファイル | 役割 |
| --- | --- |
| `index.html` | ページ構造（マークアップ）のみ。`style.css`と`script.js`を読み込む |
| `style.css` | 盤面・スコア表示・READY/GAME OVERオーバーレイなどの見た目全般。ライト/ダークテーマ対応（`prefers-color-scheme`、および`data-theme`属性による明示指定） |
| `script.js` | ゲームロジック本体。盤面サイズ、移動・当たり判定、ハート/爆弾の出現、効果音（Web Audio API）、リサイズ対応などをIIFE内に実装 |

## 実装メモ

- 盤面は50×25マス（`script.js`内`NX`/`NY`）。セルサイズは画面幅に応じて`fitBoard()`が自動調整します（`--cell`というCSSカスタムプロパティを使用）。
- 効果音は外部音源を使わず、Web Audio APIでオシレーター/ノイズから都度生成しています（`beep()` / `explode()` / `poof()`）。
- 依存ライブラリ・ビルドステップなし。Google Fonts（IBM Plex Mono / IBM Plex Sans JP）のみ外部から読み込みます。
