import React from "react";

export default function Image(props: any) {
  const { src, alt, fill, priority, unoptimized, className, sizes, style, children, ...rest } = props;
  const customStyle: React.CSSProperties = {
    ...(fill
      ? {
          width: "100%",
          height: "100%",
          objectFit: "contain",
          display: "block",
        }
      : {
          maxWidth: "100%",
          height: "auto",
          display: "block",
        }),
    ...style,
  };
  return <img src={src} alt={alt || ""} className={className} style={customStyle} {...rest} />;
}
