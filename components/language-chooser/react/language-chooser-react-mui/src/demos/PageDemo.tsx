/** @jsxImportSource @emotion/react */
import { css } from "@emotion/react";
import { defaultSearchResultModifier } from "@ethnolib/find-language";
import { Slider, ThemeProvider, Typography, useTheme } from "@mui/material";
import { LanguageChooser } from "../LanguageChooser";
import React from "react";

const darkColor = "#800303";
const mediumColor = "#bd746f";
const lightColor = "#e8caca";
const veryLightColor = "#f7ebeb";

export const PageDemo: React.FunctionComponent = () => {
  const [languageTag, setLanguageTag] = React.useState("");
  const [height, setHeight] = React.useState(500);
  const [width, setWidth] = React.useState(900);
  const mainSectionHeight = `${height}px`;
  const languageChooserWidth = `${width}px`;

  const theme = useTheme();
  return (
    <ThemeProvider theme={theme}>
      <div
        css={css`
          width: 100%;
        `}
      >
        <div
          css={css`
            background-color: ${lightColor};
            padding: 20px;
            border-bottom: 2px solid ${mediumColor};
          `}
        >
          <Typography
            variant="h1"
            css={css`
              font-size: 2rem;
              color: ${darkColor};
            `}
          >
            This demonstrates the Language Chooser in a non-dialog context. It
            should be responsive to size changes.
          </Typography>
          <div
            id="slider-row"
            css={css`
              display: flex;
              gap: 70px;
            `}
          >
            <div
              id="height-slider-container"
              css={css`
                margin-top: 20px;
              `}
            >
              <Typography>Adjust Height:</Typography>
              <Slider
                css={css`
                  color: black;
                  width: 250px;
                `}
                value={height}
                max={700}
                min={300}
                onChange={(_, value) => setHeight(value as number)}
              />
            </div>
            <div
              id="width-slider-container"
              css={css`
                margin-top: 20px;
              `}
            >
              <Typography>Adjust Width:</Typography>
              <Slider
                css={css`
                  color: black;
                  width: 250px;
                `}
                value={width}
                max={1100}
                min={600}
                onChange={(_, value) => setWidth(value as number)}
              />
            </div>
          </div>
        </div>
        <div
          css={css`
            display: flex;
            flex-direction: column;
            flex-shrink: 1;
            height: 100vh;
          `}
        >
          <div
            css={css`
              display: flex;
              flex-shrink: 1;
              background-color: ${lightColor};
            `}
          >
            <div
              id="top-left"
              css={css`
                background-color: ${veryLightColor};
                max-height: ${mainSectionHeight};
                width: 50px;
                flex-grow: 0;
              `}
            ></div>
            <div
              id="lc"
              css={css`
                max-height: ${mainSectionHeight};
                width: ${languageChooserWidth};
                flex-grow: 0;
                flex-shrink: 0;
                background-color: white;
                color: ${darkColor};
              `}
            >
              <LanguageChooser
                initialSearchString="uzbek"
                initialSelectionLanguageTag={"uz-cyrl"}
                searchResultModifier={defaultSearchResultModifier}
                onSelectionChange={(
                  _orthography,
                  languageTag: string | undefined
                ) => {
                  setLanguageTag(languageTag || "");
                }}
              />
            </div>
            <div
              css={css`
                background-color: ${veryLightColor};
                max-height: ${mainSectionHeight};
                color: ${darkColor};
                padding: 20px;
                width: 500px;
                flex-grow: 1;
                flex-shrink: 1;
                overflow: hidden;
              `}
            >
              <Typography>{loremIpsum}</Typography>
            </div>
          </div>
          <div
            id="bottom"
            css={css`
              background-color: ${lightColor};
              width: 100%;
              height: 100%;
              padding: 30px;
              display: flex;
              gap: 40px;
            `}
          >
            <Typography
              css={css`
                font-size: 1.5rem;
                border: 2px solid ${darkColor};
                padding: 15px 35px;
                min-width: 500px;
                height: fit-content;
                background-color: ${veryLightColor};
              `}
            >
              Selected Language Tag: {languageTag}
            </Typography>
          </div>
        </div>
      </div>
    </ThemeProvider>
  );
};

const loremIpsum =
  "Lorem ipsum dolor sit amet, consectetur adipiscing elit. In et est sed magna venenatis ultrices consectetur faucibus risus. Nullam aliquet varius leo eget bibendum. Pellentesque vestibulum magna vitae commodo faucibus. Maecenas metus tortor, lobortis eget fringilla nec, ultricies in orci. Phasellus convallis iaculis turpis. Aliquam lobortis congue vehicula. Pellentesque molestie eleifend feugiat. Etiam lectus risus, suscipit non quam sit amet, condimentum convallis tortor. Suspendisse sodales auctor condimentum. Sed sed ullamcorper tortor, non placerat diam. Donec vitae orci ac odio ultricies rhoncus et et elit. Fusce semper dolor id lectus lobortis molestie. Interdum et malesuada fames ac ante ipsum primis in faucibus. Phasellus commodo enim in facilisis malesuada. Ut non euismod dui. Morbi sapien odio, sodales vitae auctor ac, lobortis ut felis. Nulla ornare diam id vestibulum tincidunt. Curabitur vel ex ipsum. Aenean vel porttitor metus. Praesent vehicula sit amet libero ut ultrices. Ut viverra eros id luctus viverra. Aliquam volutpat, dui in fermentum cursus, nisl lectus euismod justo, sed posuere ligula odio a purus. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed eget suscipit tortor. Suspendisse imperdiet dui nisi, eget cursus ipsum varius at. Mauris elit erat, sodales eu ligula quis, blandit tempus nulla. Aenean vestibulum congue pharetra. Sed risus tortor, blandit nec ultricies non, vestibulum quis tortor. Donec in gravida ante. Vivamus luctus velit non consequat sodales. Vestibulum eget nisi velit. Etiam venenatis scelerisque dolor non mattis. Orci varius natoque penatibus et magnis dis parturient montes, nascetur ridiculus mus. Phasellus quis interdum enim. Donec feugiat risus nec tempor iaculis. Morbi sollicitudin venenatis ullamcorper. Praesent massa arcu, venenatis ut tincidunt vel, feugiat eget augue. Nunc pellentesque justo dolor, ut hendrerit ipsum vulputate eu. Sed sed ipsum ut ligula maximus fermentum eget pretium leo. Aliquam feugiat ante eget lectus semper, in vulputate quam aliquet. Phasellus ac turpis sed ipsum gravida dapibus. Praesent vehicula magna lectus, vitae efficitur libero feugiat accumsan. Nunc bibendum, lacus quis mollis elementum, odio mi ultricies nisl, nec pretium nunc erat id mauris. Sed volutpat purus arcu, sed tincidunt quam interdum congue. Curabitur laoreet malesuada risus, at dictum justo aliquet sed. Etiam venenatis sem quis diam mollis rutrum. Mauris est ligula, dictum sed ultrices in, suscipit et nisl. Nunc massa est, consequat eu fringilla in, venenatis elementum libero. Proin maximus condimentum sodales. Integer tempus velit non arcu consequat, eget finibus lectus pellentesque. Donec tempus ornare elementum. Nullam eget diam vel eros tincidunt sodales vel non diam. Etiam leo felis, tincidunt in tincidunt ";
