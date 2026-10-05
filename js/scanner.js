const imageInput = document.getElementById("imageInput");
const previewImage = document.getElementById("previewImage");

imageInput.addEventListener("change", function () {

    const file = this.files[0];

    if (!file) return;

    const reader = new FileReader();

    reader.onload = function (event) {

        previewImage.src = event.target.result;
        previewImage.style.display = "block";

    };

    reader.readAsDataURL(file);

});

function verifyProduct() {

    const product = document.getElementById("productName").value;

    const mrp = parseFloat(
        document.getElementById("mrp").value
    );

    const quantity = parseFloat(
        document.getElementById("quantity").value
    );

    const unit = document.getElementById("unit").value;

    const printedUSP = parseFloat(
        document.getElementById("printedUSP").value
    );

    const manufacturer =
        document.getElementById("manufacturer").value;

    if (!product || !mrp || !quantity || !printedUSP) {

        alert("Please enter all required fields.");

        return;

    }

    /*
        LegalLens prototype USP calculation.

        Expected USP =
        MRP / normalized quantity

        For kg/l, quantity is converted
        into g/ml respectively.
    */

    let normalizedQuantity = quantity;

    if (unit === "kg") {
        normalizedQuantity = quantity * 1000;
    }

    if (unit === "l") {
        normalizedQuantity = quantity * 1000;
    }

    const expectedUSP =
        Number((mrp / normalizedQuantity).toFixed(2));

    const uspMatch =
        Math.abs(expectedUSP - printedUSP) < 0.01;

    const checks = {

        "MRP declaration": mrp > 0,

        "Net quantity declaration": quantity > 0,

        "Manufacturer declaration":
            manufacturer.trim().length > 0,

        "USP calculation": uspMatch

    };

    let failed = 0;

    Object.values(checks).forEach(value => {

        if (!value) failed++;

    });

    let status = "PASS";

    if (failed > 0 && failed < 3) {
        status = "REVIEW";
    }

    if (failed >= 3) {
        status = "FAIL";
    }

    const result = {

        product,
        mrp,
        quantity,
        unit,
        manufacturer,
        printedUSP,
        expectedUSP,
        status,
        checks

    };

    localStorage.setItem(
        "legalLensReport",
        JSON.stringify(result)
    );

    window.location.href = "report.html";

}
