# sample.tf
# Terraform sample configuration to test syntax highlighting in themes

terraform {
    required_version = ">= 1.0.0"
}

provider "null" {}

resource "null_resource" "example" {
    provisioner "local-exec" {
        command = "echo Hello, Dragonball Theme!"
    }
}

variable "greeting" {
    description = "A greeting message"
    type        = string
    default     = lower("Hello, Terraform!")
}

output "greeting_message" {
    value = var.greeting
}