export function BackwardIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      strokeWidth="3"
      stroke="#FFFFFF"
      fill="none"
      className={`duration-300 transform transition-all ${props.className}`}
    >
      <path
        strokeLinecap="round"
        d="M9.57 15.41l2.6 8.64 8.64-2.61M26.93 41.41V23a.09.09 0 00-.16-.07s-2.58 3.69-4.17 4.78"
      ></path>
      <rect x="32.19" y="22.52" width="11.41" height="18.89" rx="5.7"></rect>
      <path
        d="M12.14 23.94a21.91 21.91 0 11-.91 13.25"
        strokeLinecap="round"
      ></path>
    </svg>
  );
}

export function ForwardIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      strokeWidth="3"
      stroke="#FFFFFF"
      fill="none"
      className={`duration-300 transform transition-all ${props.className}`}
    >
      <path
        d="M23.93 41.41V23a.09.09 0 00-.16-.07s-2.58 3.69-4.17 4.78"
        strokeLinecap="round"
      ></path>
      <rect x="29.19" y="22.52" width="11.41" height="18.89" rx="5.7"></rect>
      <path
        strokeLinecap="round"
        d="M54.43 15.41l-2.6 8.64-8.64-2.61M51.86 23.94a21.91 21.91 0 10.91 13.25"
      ></path>
    </svg>
  );
}

export function PauseIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      strokeWidth="3"
      stroke="#FFFFFF"
      fill="none"
      className={`duration-300 transform transition-all ${props.className}`}
    >
      <path d="M19.2 10.99h7.03v41.96H19.2zM35.06 10.99h7.03v41.96h-7.03z"></path>
    </svg>
  );
}

export function PlayIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      strokeWidth="3"
      stroke="#FFFFFF"
      fill="none"
      className={`duration-300 transform transition-all ${props.className}`}
    >
      <path d="M14 53.64V10.36a1 1 0 011.54-.84l34.02 21.64a1 1 0 010 1.68L15.51 54.48a1 1 0 01-1.51-.84z"></path>
    </svg>
  );
}

export function FullScreenIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      strokeWidth="3"
      stroke="#FFFFFF"
      fill="none"
      className={`duration-300 transform transition-all ${props.className}`}
    >
      <path d="M7.49 26V7.5h18.5M56.51 26V7.5h-18.5M7.53 38v18.5h18.49M56.51 38v18.5h-18.5"></path>
    </svg>
  );
}

export function MinimizeIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      strokeWidth="3"
      stroke="#FFFFFF"
      fill="none"
      className={`duration-300 transform transition-all ${props.className}`}
    >
      <path d="M27.53 6.93v20.61H6.92M36.47 6.93v20.61h20.61M27.57 57.07V36.46H6.96M36.47 57.07V36.46h20.61"></path>
    </svg>
  );
}
