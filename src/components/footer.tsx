export function Footer() {
  return (
    <footer
      className="bg-black text-white pt-16 pb-12 px-6 lg:px-12 border-t border-neutral-900"
      data-purpose="site-footer"
    >
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-end gap-10">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 border-[1.75px] border-white flex flex-col justify-end p-1.5 relative rounded-sm">
              <div className="w-full h-[2px] bg-white mb-1"></div>
              <div className="w-2/3 h-[2px] bg-white mb-1"></div>
              <div className="w-full flex justify-between items-end">
                <span className="w-1.5 h-1.5 bg-white rounded-full"></span>
                <div className="w-2 h-3.5 border-t-[2px] border-l-[2px] border-white"></div>
              </div>
            </div>
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-extrabold tracking-wider uppercase text-white leading-none">
              HOTEL FEDERATION RAJASTHAN
            </span>
            <span className="text-[10px] font-semibold tracking-[0.25em] text-neutral-400 uppercase mt-0.5">
              Dev Stays · Raja Park, Jaipur
            </span>
          </div>

          <div className="text-xs text-neutral-400 space-y-1.5 pt-2 font-normal">
            <p className="hover:text-white transition-colors">
              <a href="tel:+911412894400">+91 141 289 4400</a>
            </p>
            <p className="hover:text-white transition-colors">
              <a href="mailto:concierge@devstaysjaipur.com">
                concierge@devstaysjaipur.com
              </a>
            </p>
            <p className="hover:text-white transition-colors">
              <a
                href="https://instagram.com/devstays.jaipur"
                target="_blank"
                rel="noopener noreferrer"
                className="text-amber-400 hover:text-amber-300 transition-colors flex items-center gap-1"
              >
                <span>Instagram: @devstays.jaipur</span>
                <span>↗</span>
              </a>
            </p>
            <p className="text-neutral-500">
              Raja Park, Central Jaipur, Rajasthan 302004, India
            </p>
          </div>
        </div>

        <div className="flex flex-col md:items-end gap-4">
          <p className="text-[11px] text-neutral-400">
            © 2026 Hotel Federation Rajasthan. Featuring Dev Stay, Jaipur. All
            Rights Reserved.
          </p>
          <div className="flex items-center gap-3 text-[10px] text-neutral-500">
            <a className="hover:text-white transition-colors" href="#">
              Privacy Policy
            </a>
            <span>•</span>
            <a className="hover:text-white transition-colors" href="#">
              Terms & Conditions
            </a>
            <span>•</span>
            <a className="hover:text-white transition-colors" href="#">
              Cancellation Policy
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

