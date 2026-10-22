import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// House of 3D tile at 180px (brand blue, white nozzle-over-house glyph).
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0000f2",
          borderRadius: 0,
        }}
      >
        <svg
          width="116"
          height="116"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#ffffff"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M9 3h6v2.5L13.5 7h-3L9 5.5z" />
          <path d="M12 7v1c-2.8 0-2.8 3.2 0 3.2" />
          <path d="M5.5 16.5 12 11.2l6.5 5.3" />
          <path d="M7.5 15v6h9v-6" />
          <path d="M11 17.5h2v2h-2z" />
        </svg>
      </div>
    ),
    { ...size },
  );
}
