import React from "react";

export function Image(props: any) {
  const { src, alt, fill, priority, unoptimized, className, sizes, style, children, ...rest } = props;
  const customStyle: React.CSSProperties = {
    ...(fill ? { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" } : {}),
    ...style,
  };
  return <img src={src} alt={alt || ""} className={className} style={customStyle} {...rest} />;
}

export function Link(props: any) {
  const { href, children, className, onClick, ...rest } = props;
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (onClick) onClick(e);
    if (!e.defaultPrevented && href && !href.startsWith("http") && !href.startsWith("#")) {
      e.preventDefault();
      window.history.pushState({}, "", href);
      window.dispatchEvent(new PopStateEvent("popstate"));
    }
  };
  return (
    <a href={href} className={className} onClick={handleClick} {...rest}>
      {children}
    </a>
  );
}

export default Image;
