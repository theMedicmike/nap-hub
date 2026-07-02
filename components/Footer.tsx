import { Seal } from "./Seal";

export function Footer() {
  return (
    <footer className="foot">
      <div className="foot-in">
        <div className="org">
          <Seal size={22} />
          <span>Operation Whole Health</span>
        </div>
        <div className="disc">
          An open, early-stage framework offered for review and discussion — not medical advice.
        </div>
      </div>
    </footer>
  );
}
