# Mermaid Diagram Generation

This directory contains configuration files for generating Mermaid diagrams as PNG images.

## Configuration Files

### mermaid-config.json
Defines the visual styling for Mermaid diagrams with a soft, friendly pastel color scheme inspired by Anthropic's design aesthetic:
- Light blue (#a8c5e3) for primary elements
- Lavender (#d4b5d4) for secondary elements
- Sage green (#c9dbc9) for tertiary elements
- Clean, professional appearance with good readability

### puppeteer-config.json
Puppeteer configuration to bypass Chrome sandbox restrictions when running in certain environments.

## How It Works

When you run `npm run generate-posts`, the script:

1. Scans `public/images/` recursively for all `.mmd` (Mermaid) files
2. For each `.mmd` file, generates a corresponding `.png` file using:
   - Width: 1400px
   - Background: transparent
   - Color scheme from `mermaid-config.json`
3. Continues with normal post generation

## Adding New Diagrams

To add a new Mermaid diagram:

1. Create a `.mmd` file in the appropriate `public/images/` subdirectory:
   ```
   public/images/your-post-name/diagram-name.mmd
   ```

2. Write your Mermaid diagram syntax in the file:
   ```mermaid
   graph TD
       A[Start] --> B[Process]
       B --> C[End]
   ```

3. Run `npm run generate-posts` to generate the PNG

4. Reference it in your markdown:
   ```markdown
   ![Diagram Description](/images/your-post-name/diagram-name.png)
   ```

## Requirements

The `@mermaid-js/mermaid-cli` package is installed as a dev dependency in this repository. When you run `npm install`, it will be automatically installed locally.

No global installation is required - the script uses the local version from `node_modules/.bin/mmdc`.

## Customizing Colors

To change the color scheme, edit `mermaid-config.json`. The current palette uses:
- Soft, friendly pastels for a professional, approachable look
- High contrast text (#2c3e50) for readability
- Light background (#f5f5f0) that works well with transparency
