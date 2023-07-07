#!/usr/bin/env node
import { Command } from "commander";
const program = new Command();
program
  .version("0.0.1")
  .option("-l, --list [list]", "list of customers in CSV file")
  .parse(process.argv);
