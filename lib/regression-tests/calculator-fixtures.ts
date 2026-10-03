import type { Calculator } from '../calculator/types';

// The partition wall the calculator tests are built on: a wall with studs, sheeting and paint, whose
// cost comes to 2716.56 for a 4 m by 2.5 m wall (60 cm studs, 10 % spill). It began as a retired module
// converted into a calculator; this is that result, written out.
export const partitionWall: Calculator = {
  "id": "id-23",
  "name": "Partition wall",
  "inputs": [
    {
      "id": "id-1",
      "key": "width",
      "label": "Width",
      "widget": "number",
      "value": {
        "kind": "number",
        "unitSymbol": "m",
        "unitCategory": "length"
      }
    },
    {
      "id": "id-2",
      "key": "height",
      "label": "Height",
      "widget": "number",
      "value": {
        "kind": "number",
        "unitSymbol": "m",
        "unitCategory": "length"
      }
    },
    {
      "id": "id-3",
      "key": "stud_spacing",
      "label": "Stud spacing",
      "widget": "dropdown",
      "value": {
        "kind": "choice",
        "options": [
          {
            "id": "id-4",
            "label": "40",
            "value": 0.4
          },
          {
            "id": "id-5",
            "label": "60",
            "value": 0.6
          }
        ],
        "unitSymbol": "cm",
        "unitCategory": "length",
        "default": "id-5"
      }
    },
    {
      "id": "id-6",
      "key": "lumber",
      "label": "Lumber",
      "widget": "picker",
      "value": {
        "kind": "material",
        "category": "Lumber"
      }
    },
    {
      "id": "id-7",
      "key": "spill",
      "label": "Spill",
      "widget": "dropdown",
      "value": {
        "kind": "choice",
        "options": [
          {
            "id": "id-8",
            "label": "0",
            "value": 0
          },
          {
            "id": "id-9",
            "label": "10",
            "value": 10
          },
          {
            "id": "id-10",
            "label": "15",
            "value": 15
          }
        ],
        "unitSymbol": "%",
        "unitCategory": "percentage"
      }
    },
    {
      "id": "id-11",
      "key": "sheets",
      "label": "Sheets",
      "widget": "picker",
      "value": {
        "kind": "material",
        "category": "Sheets"
      }
    },
    {
      "id": "id-12",
      "key": "sheeting_on_both_sides",
      "label": "Sheeting on both sides",
      "widget": "toggle",
      "value": {
        "kind": "boolean",
        "default": false
      }
    },
    {
      "id": "id-13",
      "key": "paint",
      "label": "Paint",
      "widget": "picker",
      "value": {
        "kind": "material",
        "category": "Paint"
      }
    },
    {
      "id": "id-14",
      "key": "paint_layers",
      "label": "Paint layers",
      "widget": "number",
      "value": {
        "kind": "number",
        "default": 2
      }
    },
    {
      "id": "id-15",
      "key": "painted_on_both_sides",
      "label": "Painted on both sides",
      "widget": "toggle",
      "value": {
        "kind": "boolean",
        "default": false
      }
    },
    {
      "id": "id-16",
      "key": "quantity",
      "label": "Quantity",
      "widget": "number",
      "value": {
        "kind": "number",
        "unitSymbol": "pcs",
        "unitCategory": "count",
        "default": 1
      }
    }
  ],
  "parts": [
    {
      "id": "id-17",
      "name": "Partition wall",
      "costStepId": "id-22"
    }
  ],
  "steps": [
    {
      "id": "id-18",
      "partId": "id-17",
      "key": "paint_area",
      "label": "Paint area",
      "source": {
        "type": "expression",
        "expression": "area_rectangle(width, height)"
      },
      "unitSymbol": "m2",
      "unitCategory": "area",
      "format": "number"
    },
    {
      "id": "id-19",
      "partId": "id-17",
      "key": "framing",
      "label": "Framing",
      "source": {
        "type": "expression",
        "expression": "perimeter_rectangle(width, height)+ height * stud_count(width, stud_spacing)"
      },
      "unitSymbol": "m",
      "unitCategory": "length",
      "format": "number"
    },
    {
      "id": "id-20",
      "partId": "id-17",
      "key": "sheet_count",
      "label": "Sheet count",
      "source": {
        "type": "expression",
        "expression": "sheets_height(height, sheets) * sheets_width(width, sheets) * ((sheeting_on_both_sides ==1) + 1)"
      },
      "unitSymbol": "pcs",
      "unitCategory": "count",
      "format": "number"
    },
    {
      "id": "id-21",
      "partId": "id-17",
      "key": "paint_volume",
      "label": "Paint volume",
      "source": {
        "type": "expression",
        "expression": "area_rectangle(width, height) * paint_layers * ((painted_on_both_sides ==1) + 1) / paint.coverage"
      },
      "unitSymbol": "l",
      "unitCategory": "volume",
      "unitIsLabel": true,
      "format": "number"
    },
    {
      "id": "id-22",
      "partId": "id-17",
      "key": "cost",
      "label": "Cost",
      "source": {
        "type": "expression",
        "expression": "(((framing*spill(spill))*lumber.price) + (sheet_count * sheets.price_per_sheet) + ((ceil(paint_volume/paint.volume))*paint.price_per_bucket))*quantity"
      },
      "format": "money"
    }
  ],
  "layout": [
    {
      "id": "id-24",
      "items": [
        {
          "type": "input",
          "inputId": "id-1"
        },
        {
          "type": "input",
          "inputId": "id-2"
        },
        {
          "type": "input",
          "inputId": "id-3"
        },
        {
          "type": "input",
          "inputId": "id-6"
        },
        {
          "type": "input",
          "inputId": "id-7"
        },
        {
          "type": "input",
          "inputId": "id-11"
        },
        {
          "type": "input",
          "inputId": "id-12"
        },
        {
          "type": "input",
          "inputId": "id-13"
        },
        {
          "type": "input",
          "inputId": "id-14"
        },
        {
          "type": "input",
          "inputId": "id-15"
        },
        {
          "type": "input",
          "inputId": "id-16"
        }
      ]
    },
    {
      "id": "id-25",
      "title": "Results",
      "items": [
        {
          "type": "result",
          "stepId": "id-18",
          "style": "row"
        },
        {
          "type": "result",
          "stepId": "id-19",
          "style": "row"
        },
        {
          "type": "result",
          "stepId": "id-20",
          "style": "row"
        },
        {
          "type": "result",
          "stepId": "id-21",
          "style": "row"
        },
        {
          "type": "result",
          "stepId": "id-22",
          "style": "headline"
        }
      ]
    }
  ],
  "createdAt": "now",
  "updatedAt": "now"
};
