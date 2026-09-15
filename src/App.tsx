import { useEffect, useRef, useState } from "react";
import { CATS, artUrl, loadImages } from "./game/assets";
import {
  GUNS,
  costAt,
  damageFor,
  format,
  maxed,
  moneyAt,
  rateFor,
  stageLabel,
  type CatId,
  type Motion,
  type Upgrade,
  type WeaponId,
} from "./game/config";
import { Engine, type Hud } from "./game/engine";
import { defaults, SaveStore } from "./game/save";
import { isEditing } from "./game/input";
import { missionStatus } from "./game/simulation";
import { TEXT as T } from "./game/strings";
import "./style.css";

type IconName =
  | "pause"
  | "settings"
  | "cash"
  | "damage"
  | "rate"
  | "money"
  | "close"
  | "heart"
  | "mission";
function Icon({ name }: { name: IconName }) {
  const paths = {
    pause: (
      <>
        <path fill="currentColor" d="M5 3h4v18H5ZM15 3h4v18h-4Z" />
      </>
    ),
    settings: (
      <>
        <path d="m9 3 1-2h4l1 2 3 2 2 1v4l-2 2-1 3-2 2h-4l-2-2-3-1-2-2V8l2-2Z" />
        <circle cx="12" cy="9" r="3" />
      </>
    ),
    cash: (
      <>
        <path fill="#77cf78" d="m2 7 16-5 4 15-16 5Z" />
        <path d="m5 9 11-4 3 10-11 4Z" />
        <path fill="#c9ee9c" d="M14 9c5 5-1 10-4 5s1-8 4-5Z" />
      </>
    ),
    damage: (
      <path
        fill="#ff7460"
        d="m4 21 1-9-3-5 6 1 3-6 3 5 6-2-1 6 3 4-6 2-2 5-4-4Z"
      />
    ),
    rate: <path fill="#ffd54d" d="M15 1 3 14h8l-2 9L22 9h-9Z" />,
    money: (
      <>
        <path fill="#77cf78" d="m2 7 16-5 4 15-16 5Z" />
        <path d="m5 9 11-4 3 10-11 4Z" />
        <path fill="#c9ee9c" d="M14 9c5 5-1 10-4 5s1-8 4-5Z" />
      </>
    ),
    close: <path d="m6 6 12 12M18 6 6 18" />,
    heart: (
      <path
        fill="#f07666"
        d="M12 21S2 15 2 8a5 5 0 0 1 10-1 5 5 0 0 1 10 1c0 7-10 13-10 13Z"
      />
    ),
    mission: (
      <>
        <path fill="#f9e3a1" d="M5 4h14v18H5Z" />
        <path fill="#bc8f53" d="M9 2h6v5H9Z" />
        <path d="m8 13 2 2 5-5m-7 9h8" />
      </>
    ),
  };
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  );
}
type Modal =
  "pause" | "cats" | "settings" | "reset" | "weapons" | "missions" | null;

export default function App() {
  const [initial] = useState(() => {
    const store = new SaveStore(),
      loaded = store.load();
    return { store, progress: loaded ?? defaults(), fresh: !loaded };
  });
  const [hud, setHud] = useState<Hud>({
    progress: initial.progress,
    hp: 100,
    defeated: 0,
    total: 6,
    completion: 0,
    stage: initial.progress.stage,
    phase: "active",
    hint: true,
    unavailable: initial.store.unavailable,
    paused: false,
  });
  const [ready, setReady] = useState(false),
    [error, setError] = useState(false),
    [attempt, setAttempt] = useState(0);
  const [modal, setModal] = useState<Modal>(initial.fresh ? "cats" : null),
    [selected, setSelected] = useState<CatId>(initial.progress.cat);
  const canvas = useRef<HTMLCanvasElement>(null),
    engine = useRef<Engine | null>(null),
    dialog = useRef<HTMLDialogElement>(null),
    modalRef = useRef(modal);
  modalRef.current = modal;
  useEffect(() => {
    let cancelled = false;
    loadImages()
      .then((images) => {
        if (cancelled) return;
        engine.current = new Engine(
          canvas.current!,
          images,
          initial.progress,
          initial.store,
          setHud,
          !!modalRef.current,
        );
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
      engine.current?.destroy();
      engine.current = null;
    };
  }, [attempt, initial]);
  useEffect(() => {
    engine.current?.setModal(!!modal);
    if (modal && ready) {
      if (!dialog.current?.open) dialog.current?.showModal();
    } else dialog.current?.close();
  }, [modal, ready]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const game = engine.current,
        key = event.key.toLowerCase();
      if (
        !game ||
        event.repeat ||
        isEditing(event.target) ||
        (key !== "p" && key !== "escape")
      )
        return;
      event.preventDefault();
      if (modalRef.current === "pause") {
        game.setPaused(false);
        setModal(null);
      } else if (key === "escape" && modalRef.current) {
        setModal(game.manualPaused ? "pause" : null);
      } else {
        game.setPaused(true);
        setModal("pause");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const p = hud.progress,
    weapon = p.weapon;
  const stage = hud.stage;
  const substage = (stage - 1) % 10,
    percent = Math.min(100, Math.round(hud.completion * 100));
  const missions = missionStatus(p),
    claimable = missions.filter((m) => m.ready).length;
  const open = (kind: Modal) => {
    engine.current?.unlock();
    setSelected(p.cat);
    setModal(kind);
  };
  const resume = () => {
    engine.current?.setPaused(false);
    setModal(null);
  };
  const pause = () => {
    engine.current?.setPaused(true);
    setModal("pause");
  };
  const close = () => {
    if (modal === "pause") {
      resume();
      return;
    }
    setModal(engine.current?.manualPaused ? "pause" : null);
  };
  const title =
    modal === "pause"
      ? T.paused
      : modal === "cats"
        ? T.choose
        : modal === "weapons"
          ? T.weapons
          : modal === "missions"
            ? T.missions
            : modal === "reset"
              ? T.resetTitle
              : T.settings;
  const upgrade = (kind: Upgrade) => {
    const level = p[kind],
      isMax = maxed(kind, level, p.weapon),
      cost = costAt(kind, level),
      nextProgress = { ...p, [kind]: level + 1 };
    const value =
      kind === "damage"
        ? damageFor(p)
        : kind === "rate"
          ? rateFor(p)
          : moneyAt(level);
    const next =
      kind === "damage"
        ? damageFor(nextProgress)
        : kind === "rate"
          ? rateFor(nextProgress)
          : moneyAt(level + 1);
    const valueText = (v: number) =>
      `${kind === "money" ? "×" : ""}${format(v, kind === "damage" ? 0 : 1)}`;
    return (
      <button
        key={kind}
        className={`upgrade ${kind}`}
        disabled={!ready || isMax || p.coins < cost}
        onClick={() => engine.current?.buy(kind, level)}
        aria-label={`${T[kind]}: ${valueText(value)}${isMax ? `, ${T.max}` : ` ${T.to} ${valueText(next)}, $${format(cost)}`}`}
      >
        <span className="upgrade-title">
          <Icon name={kind} />
          <strong>{T[kind]}</strong>
          <small>
            {T.level}
            {level}
          </small>
        </span>
        <span className="upgrade-values">
          {valueText(value)}
          <span className="upgrade-next">
            {isMax ? T.max : ` → ${valueText(next)}`}
          </span>
        </span>
        <span className="upgrade-unit">
          {kind === "damage"
            ? T.perShot
            : kind === "rate"
              ? T.perSecond
              : T.multiplier}
        </span>
        <span className="upgrade-price">
          {isMax ? (
            T.max
          ) : (
            <>
              <Icon name="cash" />${format(cost)}
            </>
          )}
        </span>
      </button>
    );
  };
  return (
    <main
      onPointerDown={() => engine.current?.unlock()}
      onKeyDown={() => engine.current?.unlock()}
    >
      <div className="game-shell">
        <div className="battlefield">
          <canvas ref={canvas} aria-label={T.battlefield} role="img" />
          <section className="hud" aria-label={T.gameStatus}>
            <div
              className="stage-track"
              role="progressbar"
              aria-label={T.stageProgress}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={percent}
            >
              <i style={{ width: `${percent}%` }} />
              <strong>{percent}%</strong>
            </div>
            <div className="hud-row">
              <button
                className="settings-control pause-control"
                aria-label={T.pause}
                onClick={pause}
                disabled={!ready}
              >
                <Icon name="pause" />
                <span>{T.pause}</span>
              </button>
              <div className="route-group">
                <div
                  className="route"
                  aria-label={`${T.stage} ${stageLabel(stage)}`}
                >
                  {Array.from({ length: 10 }, (_, i) => (
                    <span
                      key={i}
                      className={`${i < substage ? "passed" : ""} ${i === substage ? "current" : ""}`}
                      aria-hidden="true"
                    >
                      {i === substage ? (
                        <img src={artUrl(p.cat)} alt="" />
                      ) : i === 9 ? (
                        "★"
                      ) : (
                        ""
                      )}
                    </span>
                  ))}
                </div>
                <strong className="stage-label">
                  {T.stage} {stageLabel(stage)}
                  {stage % 10 === 0 ? ` · ${T.boss}` : ""}
                </strong>
              </div>
              <div
                className="cash-total"
                aria-label={`$${format(p.coins)} ${T.coinUnit}`}
              >
                <Icon name="cash" />
                <strong>${format(p.coins)}</strong>
              </div>
            </div>
            <div
              className="health"
              role="meter"
              aria-label={T.health}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.ceil(hud.hp)}
            >
              <Icon name="heart" />
              <span className="health-track">
                <i style={{ width: `${hud.hp}%` }} />
              </span>
              <strong>{Math.ceil(hud.hp)}</strong>
            </div>
          </section>
          <div className="battle-status" aria-live="polite">
            {!ready &&
              (error ? (
                <>
                  <span>{T.loadError}</span>
                  <button
                    onClick={() => {
                      setError(false);
                      setAttempt(attempt + 1);
                    }}
                  >
                    {T.retry}
                  </button>
                </>
              ) : (
                T.loading
              ))}
          </div>
          {ready && hud.hint && !modal && (
            <p className="control-hint">{T.controls}</p>
          )}
          <nav className="battle-actions" aria-label={T.gameControls}>
            <button
              className="weapon-control"
              onClick={() => open("weapons")}
              disabled={!ready}
            >
              <img src={artUrl(weapon)} alt="" />
              <span>{T.weapons}</span>
            </button>
            <button
              className="mission-control"
              aria-label={T.missions}
              aria-description={claimable > 0 ? T.missionReady : undefined}
              onClick={() => open("missions")}
              disabled={!ready}
            >
              <Icon name="mission" />
              <span>{T.missions}</span>
              {claimable > 0 && <b aria-hidden="true">!</b>}
            </button>
          </nav>
        </div>
        <section className="upgrades" aria-label={T.upgrades}>
          {upgrade("damage")}
          {upgrade("rate")}
          {upgrade("money")}
        </section>
        {hud.unavailable && (
          <p className="save-notice" role="status">
            {T.saveUnavailable}
          </p>
        )}
      </div>
      <dialog
        aria-labelledby="dialog-title"
        ref={dialog}
        className={
          modal === "weapons" || modal === "missions" ? "management-dialog" : ""
        }
        onCancel={(e) => {
          e.preventDefault();
          close();
        }}
        onClose={() => {
          if (modalRef.current) setModal(null);
        }}
      >
        <div className="dialog-heading">
          <h2 id="dialog-title">{title}</h2>
          <button className="close-button" onClick={close} aria-label={T.close}>
            <Icon name="close" />
          </button>
        </div>
        {(modal === "weapons" || modal === "missions") && (
          <div className="menu-cash">
            <Icon name="cash" />${format(p.coins)}
          </div>
        )}
        {modal === "pause" && (
          <div className="pause-actions">
            <button className="primary" onClick={resume}>
              {T.resume}
            </button>
            <button className="secondary" onClick={() => open("settings")}>
              {T.settings}
            </button>
          </div>
        )}
        {modal === "cats" && (
          <>
            <div className="cat-options" role="group" aria-label={T.choose}>
              {CATS.map((cat) => (
                <button
                  key={cat}
                  aria-pressed={selected === cat}
                  onClick={() => setSelected(cat)}
                  className={selected === cat ? "selected" : ""}
                >
                  <img
                    src={artUrl(cat)}
                    alt={`${T.catNames[cat]} ${T.catUnit}`}
                  />
                  <span>
                    {T.catNames[cat]} {selected === cat && "✓"}
                  </span>
                </button>
              ))}
            </div>
            <button
              className="primary"
              onClick={() => {
                engine.current?.select(selected);
                setModal(engine.current?.manualPaused ? "pause" : null);
              }}
            >
              {T.start}
            </button>
          </>
        )}
        {modal === "weapons" && (
          <div className="weapon-list">
            {(Object.keys(GUNS) as WeaponId[]).map((id) => {
              const owned = p.ownedWeapons.includes(id),
                equipped = p.weapon === id,
                gunProgress = { ...p, weapon: id };
              return (
                <article
                  className={`weapon-entry ${equipped ? "equipped" : ""}`}
                  key={id}
                >
                  <div className="weapon-art">
                    <img src={artUrl(id)} alt="" />
                  </div>
                  <div className="weapon-info">
                    <h3>{T.weaponNames[id]}</h3>
                    <p>{T.weaponNotes[id]}</p>
                    <div className="gun-stats">
                      <span>
                        <Icon name="damage" />
                        {format(damageFor(gunProgress))}
                      </span>
                      <span>
                        <Icon name="rate" />
                        {format(rateFor(gunProgress), 1)}/s
                      </span>
                    </div>
                  </div>
                  <button
                    className="equip-button"
                    disabled={equipped || (!owned && p.coins < GUNS[id].cost)}
                    onClick={() =>
                      owned
                        ? engine.current?.equip(id)
                        : engine.current?.buyGun(id)
                    }
                  >
                    {equipped ? (
                      `✓ ${T.equipped}`
                    ) : owned ? (
                      T.equip
                    ) : (
                      <>
                        {T.buyEquip}
                        <span>${format(GUNS[id].cost)}</span>
                      </>
                    )}
                  </button>
                </article>
              );
            })}
          </div>
        )}
        {modal === "missions" && (
          <>
            <p className="mission-hint">{T.missionHint}</p>
            <div className="mission-list">
              {missions.map((m) => (
                <article className="mission-entry" key={m.id}>
                  <div className="mission-info">
                    <h3>
                      {T.missionNames[m.id]} <small>{m.tier + 1}</small>
                    </h3>
                    <p>
                      {format(m.progress)} / {format(m.target)}{" "}
                      {T.missionUnits[m.id]}
                    </p>
                    <progress
                      value={Math.min(m.progress, m.target)}
                      max={m.target}
                      aria-label={T.missionNames[m.id]}
                    />
                  </div>
                  <button
                    className="claim-button"
                    disabled={!m.ready}
                    onClick={() => engine.current?.claim(m.id, m.tier)}
                  >
                    {T.claim}
                    <span>
                      <Icon name="cash" />${format(m.reward)}
                    </span>
                  </button>
                </article>
              ))}
            </div>
          </>
        )}
        {modal === "settings" && (
          <>
            <label className="setting-row" htmlFor="mute">
              {T.mute}
              <input
                id="mute"
                type="checkbox"
                checked={p.muted}
                onChange={(e) =>
                  engine.current?.settings(e.target.checked, p.motion)
                }
              />
            </label>
            <label className="setting-row" htmlFor="motion">
              {T.motion}
              <select
                aria-label={T.motion}
                id="motion"
                value={p.motion}
                onChange={(e) =>
                  engine.current?.settings(p.muted, e.target.value as Motion)
                }
              >
                <option value="system">{T.system}</option>
                <option value="reduce">{T.reduce}</option>
                <option value="full">{T.full}</option>
              </select>
            </label>
            <button
              className="secondary cat-setting"
              onClick={() => open("cats")}
            >
              <img src={artUrl(p.cat)} alt="" />
              {T.choose}
            </button>
            <button className="reset-button" onClick={() => setModal("reset")}>
              {T.reset}
            </button>
          </>
        )}
        {modal === "reset" && (
          <>
            <p>{T.resetDescription}</p>
            <div className="reset-actions">
              <button
                className="secondary"
                onClick={() => setModal("settings")}
              >
                {T.cancel}
              </button>
              <button
                className="primary danger"
                onClick={() => {
                  engine.current?.reset();
                  setSelected("orange");
                  setModal("cats");
                }}
              >
                {T.reset}
              </button>
            </div>
          </>
        )}
      </dialog>
    </main>
  );
}
