import babel from "@rollup/plugin-babel";
import commonjs from "@rollup/plugin-commonjs";
import resolve from "@rollup/plugin-node-resolve";
import replace from "@rollup/plugin-replace";
import terser from "@rollup/plugin-terser";

import externalDeps from "rollup-plugin-peer-deps-external";
import size from "rollup-plugin-size";
import { visualizer } from "rollup-plugin-visualizer";

const external = ["react", "react-dom", "react-charts"];

const globals = {
    react: "React",
    "react-dom": "ReactDOM",
    "react-charts": "ReactCharts",
};

const inputSrcs = [["src/index.ts", "ReactCharts", "react-charts"]];

const extensions = [".js", ".jsx", ".es6", ".es", ".mjs", ".ts", ".tsx"];

const babelConfig = {
    extensions,
    babelHelpers: "runtime",
    exclude: /node_modules/,
};

const resolveConfig = {
    extensions,
};

export default inputSrcs
    .map(([input, name, file]) => [
        {
            input,
            output: {
                name,
                file: `dist/${file}.development.js`,
                format: "umd",
                sourcemap: true,
                globals,
            },
            external,
            plugins: [externalDeps(), resolve(resolveConfig), commonjs(), babel(babelConfig)],
        },
        {
            input,
            output: {
                name,
                file: `dist/${file}.production.min.js`,
                format: "umd",
                sourcemap: true,
                globals,
            },
            external,
            plugins: [
                replace({
                    preventAssignment: true,
                    "process.env.NODE_ENV": JSON.stringify("production"),
                }),
                externalDeps(),
                resolve(resolveConfig),
                commonjs(),
                babel(babelConfig),
                terser(),
                size(),
                visualizer({
                    filename: "stats-react.json",
                    json: true,
                    gzipSize: true,
                    brotliSize: true,
                }),
            ],
        },
    ])
    .flat();
