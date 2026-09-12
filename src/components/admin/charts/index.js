/**
 * The console's charts — dependency-free SVG/HTML, drawn against the admin
 * shell's tokens. Each one carries role="img" with a spoken summary and a
 * visually-hidden table of the same numbers. See Charts.module.css for the
 * palette and how it was validated.
 *
 *   LineChart  daily series, one or two on the same scale, crosshair + keys
 *   BarChart   vertical bars, each labelled with its value
 *   HBarList   ranked horizontal list with values, share and "Other" folding
 *   Donut      part-to-whole with a legend and the total in the centre
 */
export { default as LineChart } from './LineChart.jsx';
export { default as BarChart } from './BarChart.jsx';
export { default as HBarList } from './HBarList.jsx';
export { default as Donut } from './Donut.jsx';
