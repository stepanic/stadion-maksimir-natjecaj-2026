// Mermaid se crta samo u pregledniku. U prerenderu (SSR build) zamjenjuje ga
// ovaj stub, pa izvori dijagrama ostaju kao <pre class="mermaid-source">.
export default {
  initialize() {},
  render: () => new Promise<never>(() => {}),
};
