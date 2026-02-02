import { ImageResponse } from 'next/og';

export const size = {
  width: 32,
  height: 32,
};
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 24,
          background: '#0a0a0c',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '6px',
        }}
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M9 6 L12.5 26 L14 26 L11 6 Z" fill="#00e5ff" />
          <path d="M14.5 4 L17.5 28 L19 28 L16.5 4 Z" fill="#00e5ff" />
          <path d="M21 6 L23.5 26 L22 26 L20 6 Z" fill="#00e5ff" />
        </svg>
      </div>
    ),
    {
      ...size,
    }
  );
}
