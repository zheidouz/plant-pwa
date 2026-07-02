// Home-screen footer copy. Per the PRD (user story #40):
//   "I want a small 'Powered by Pl@ntNet + MiMo' footer on the home screen,
//   so that I know what powers the tool."
export default function Footer() {
  return (
    <footer className="mt-auto border-t border-stone-200 bg-white/80">
      <div className="mx-auto max-w-screen-sm px-4 py-3 text-center text-xs text-stone-500">
        Powered by{" "}
        <span className="font-medium text-stone-700">Pl@ntNet</span>
        {" + "}
        <span className="font-medium text-stone-700">MiMo</span>
      </div>
    </footer>
  );
}
