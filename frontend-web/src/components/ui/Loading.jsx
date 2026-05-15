function Loading({ text = "Memuat data..." }) {
  return (
    <div className="ui-loading">
      <div className="ui-loading-spinner" />
      <p>{text}</p>
    </div>
  );
}

export default Loading;