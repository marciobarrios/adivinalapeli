import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const marker = "adivinalapeli:test-session";
    if (!window.sessionStorage.getItem(marker)) {
      window.localStorage.clear();
      window.sessionStorage.setItem(marker, "ready");
    }
  });
});

test("configura y completa una partida por equipos", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "La peli está en tus manos." })).toBeVisible();
  await expect(page.getByText("1. Crea los equipos", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Por equipos" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Personas" })).toHaveCount(0);
  await page.getByRole("button", { name: /^Disney y Pixar/ }).click();
  await page
    .getByRole("group", { name: "Rondas" })
    .getByRole("button", { name: "1", exact: true })
    .click();
  await page.getByRole("button", { name: "Empezar partida" }).click();

  await expect(
    page.getByRole("heading", { name: "Pasa el móvil a Equipo Claqueta" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Estoy listo" }).click();
  await expect(page.getByText("Haz esta película")).toBeVisible();
  await expect(page.getByTestId("movie-poster")).toBeVisible();
  await page.getByRole("button", { name: "¡Acertada!" }).click();
  await page.getByRole("button", { name: "Terminar turno antes" }).click();

  await expect(page.getByText("+1")).toBeVisible();
  await page.getByRole("button", { name: "Siguiente turno" }).click();
  await expect(
    page.getByRole("heading", { name: "Pasa el móvil a Equipo Palomitas" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Estoy listo" }).click();
  await page.getByRole("button", { name: "Terminar turno antes" }).click();
  await page.getByRole("button", { name: "Ver resultado" }).click();

  await expect(page.getByRole("heading", { name: "Equipo Claqueta gana" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Revancha" })).toBeVisible();
});

test("admite nombres de personas que juegan individualmente", async ({ page }) => {
  await page.goto("/");

  await page.getByLabel("Equipo 1").fill("Ana");
  await page.getByLabel("Equipo 2").fill("Luis");
  await page.getByRole("button", { name: "Empezar partida" }).click();

  await expect(page.getByRole("heading", { name: "Pasa el móvil a Ana" })).toBeVisible();
});

test("permite empezar una partida de comedias", async ({ page }) => {
  await page.goto("/");

  const comedyTheme = page.getByRole("button", { name: /^Comedias/ });
  await expect(comedyTheme).toContainText("50 películas");
  await comedyTheme.click();
  await expect(comedyTheme).toHaveAttribute("aria-pressed", "true");

  await page.getByRole("button", { name: "Empezar partida" }).click();
  await page.getByRole("button", { name: "Estoy listo" }).click();

  await expect(page.getByText("Haz esta película")).toBeVisible();
  await expect(page.getByTestId("movie-poster")).toBeVisible();
});

test("restaura una partida en curso al recargar", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Empezar partida" }).click();
  await expect(
    page.getByRole("heading", { name: "Pasa el móvil a Equipo Claqueta" }),
  ).toBeVisible();

  await page.reload();

  await expect(
    page.getByRole("heading", { name: "Pasa el móvil a Equipo Claqueta" }),
  ).toBeVisible();
  await expect(page.getByText("Ronda 1 de 3").first()).toBeVisible();
});

test("vuelve a cargar sin conexión después de la primera visita", async ({ context, page }) => {
  await page.goto("/");
  await page.waitForFunction(async () => {
    if (!("serviceWorker" in navigator)) return false;
    await navigator.serviceWorker.ready;
    return true;
  });
  await page.reload();

  await context.setOffline(true);
  await page.reload();

  await expect(page.getByRole("heading", { name: "La peli está en tus manos." })).toBeVisible();
  await page.getByRole("button", { name: "Empezar partida" }).click();
  await expect(
    page.getByRole("heading", { name: "Pasa el móvil a Equipo Claqueta" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Estoy listo" }).click();

  const offlinePoster = page.getByTestId("movie-poster");
  await expect(offlinePoster).toBeVisible();
  await expect
    .poll(() =>
      offlinePoster.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0),
    )
    .toBe(true);

  await context.setOffline(false);
});

test.describe("estados de portada", () => {
  test.use({ serviceWorkers: "block" });

  test("no muestra el emoji mientras la portada está cargando", async ({ page }) => {
    let releasePoster: () => void = () => {};
    const posterGate = new Promise<void>((resolve) => {
      releasePoster = resolve;
    });

    await page.route("**/posters/**", async (route) => {
      await posterGate;
      await route.continue();
    });
    await page.goto("/");
    await page.getByRole("button", { name: "Empezar partida" }).click();
    await page.getByRole("button", { name: "Estoy listo" }).click();

    await expect(page.getByTestId("movie-poster-loading")).toBeVisible();
    await expect(page.getByTestId("movie-emoji")).toHaveCount(0);
    await expect(page.getByText("Pista emoji", { exact: true })).toHaveCount(0);

    releasePoster();

    await expect(page.getByTestId("movie-poster-loading")).toHaveCount(0);
    await expect(page.getByTestId("movie-poster")).toHaveClass(/opacity-100/);
  });

  test("muestra la pista emoji cuando una portada no puede cargarse", async ({ page }) => {
    await page.route("**/posters/**", (route) => route.abort());
    await page.goto("/");
    await page.getByRole("button", { name: "Empezar partida" }).click();
    await page.getByRole("button", { name: "Estoy listo" }).click();

    await expect(page.getByText("Pista emoji", { exact: true })).toBeVisible();
    await expect(page.getByTestId("movie-emoji")).toBeVisible();
    await expect(page.getByTestId("movie-poster")).toHaveCount(0);
  });
});
