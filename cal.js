function getNumber(promptText) {
  let num;
  while (true) {
    num = prompt(promptText);
    if (!isNaN(num) && num !== null && num.trim() !== "") {
      return parseFloat(num);
    } else {
      alert("Invalid input! Please enter a valid number.");
      continue; // re-prompt
    }
  }
}

function calculatorMenu() {
  let choice;

  do {
    choice = prompt(
      "Menu:\n1. Add\n2. Subtract\n3. Multiply\n4. Divide\n5. Exit\nEnter your choice (1-5):"
    );

    switch (choice) {
      case "1":
        // Addition
        var a = getNumber("Enter first number:");
        var b = getNumber("Enter second number:");
        alert(`Result: ${a} + ${b} = ${a + b}`);
        break;

      case "2":
        // Subtraction
        var a = getNumber("Enter first number:");
        var b = getNumber("Enter second number:");
        alert(`Result: ${a} - ${b} = ${a - b}`);
        break;

      case "3":
        // Multiplication
        var a = getNumber("Enter first number:");
        var b = getNumber("Enter second number:");
        alert(`Result: ${a} * ${b} = ${a * b}`);
        break;

      case "4":
        // Division with zero check
        var a = getNumber("Enter numerator:");
        var b;
        do {
          b = getNumber("Enter denominator (not 0):");
          if (b === 0) alert("Cannot divide by zero. Try again.");
        } while (b === 0);
        alert(`Result: ${a} / ${b} = ${a / b}`);
        break;

      case "5":
        alert("Exiting Calculator. Goodbye!");
        break;

      default:
        alert("Invalid option! Please enter a number between 1 and 5.");
        continue;
    }
  } while (choice !== "5");
}

// Run the calculator
calculatorMenu();
