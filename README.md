# pueue-web-monitor

Tailscale 経由でスマホ等からPCの状態をリアルタイム監視するWebアプリ。

## 監視項目

- **CPU 使用率** — 全体 + コア別表示、直近30分の推移グラフ
- **メモリ使用率** — Used / Total / Swap、直近30分の推移グラフ
- **pueue タスク** — 一覧（ステータス色分け、コマンド、経過時間、ログ表示）
- **pueue 並列制御** — AUTO / MANUAL モード切替、手動±ボタン

## 技術スタック

| レイヤー | 技術 |
|----------|------|
| サーバー | Node.js + Express + ws (WebSocket) |
| データ収集 | systeminformation (CPU/Mem), pueue status --json |
| フロント | React + Vite + recharts |
| 履歴 | メモリ内リングバッファ（直近30分、永続化なし） |

## セットアップ

```bash
git clone <repo-url>
cd pueue-web-monitor
npm install
cd client && npm install && cd ..
npm run build
```

## 設定

`.env.example` をコピーして `.env` を作成:

```bash
cp .env.example .env
```

| 環境変数 | デフォルト | 説明 |
|----------|-----------|------|
| `PORT` | `10453` | サーバーのリッスンポート |
| `PUEUE_BIN` | `pueue` | pueue バイナリのパス（PATH にあればそのままでOK） |
| `NODE_ENV` | - | `production` で本番モード |

## 使い方

### 本番起動

```bash
npm start
```

`http://localhost:10453` または Tailscale IP でアクセス。

### 開発モード

```bash
npm run dev
```

Vite dev server (HMR) + Node server が同時起動。

## systemd で常駐化

インストールスクリプトでユーザー名とパスを自動設定:

```bash
./scripts/install-service.sh
sudo systemctl enable --now pueue-web-monitor
```

確認:

```bash
sudo systemctl status pueue-web-monitor
journalctl -u pueue-web-monitor -f
```

## アーキテクチャ

```
[ブラウザ] ← WebSocket (3秒間隔) → [Node.js :PORT]
                                      ├── systeminformation (CPU/Mem)
                                      ├── pueue status --json (タスク)
                                      ├── autoscaler (CPU中央値ベース並列制御)
                                      └── リングバッファ (履歴30分)
```
