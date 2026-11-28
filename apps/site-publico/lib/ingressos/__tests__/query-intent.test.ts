import {
  buildIngressosPath,
  parseIngressosSearchParams,
  stripRapidoFromSearchParams,
} from "../query-intent"

describe("parseIngressosSearchParams", () => {
  it("parses city and rapido slugs", () => {
    const params = new URLSearchParams("city=caldas-novas&rapido=hot-park&utm_source=ads")
    expect(parseIngressosSearchParams(params)).toEqual({
      city: "caldas-novas",
      rapido: "hot-park",
    })
  })

  it("defaults invalid city to multi-destino", () => {
    const params = new URLSearchParams("city=invalid")
    expect(parseIngressosSearchParams(params).city).toBe("multi-destino")
  })
})

describe("stripRapidoFromSearchParams", () => {
  it("removes only rapido and preserves campaign params", () => {
    const params = new URLSearchParams("city=rio-quente&rapido=combo&utm_campaign=x")
    const next = stripRapidoFromSearchParams(params)
    expect(next.get("rapido")).toBeNull()
    expect(next.get("city")).toBe("rio-quente")
    expect(next.get("utm_campaign")).toBe("x")
  })
})

describe("buildIngressosPath", () => {
  it("builds path with query string", () => {
    const params = new URLSearchParams("city=rio-quente")
    expect(buildIngressosPath("/ingressos", params)).toBe("/ingressos?city=rio-quente")
  })
})