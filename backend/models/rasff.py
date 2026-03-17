"""
DIGBA — ORM model : rasff_rejets
"""
from datetime import date, datetime
from typing import Optional
from sqlalchemy import Integer, String, Date, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column
from backend.db.database import Base


class RasffRejet(Base):
    __tablename__ = "rasff_rejets"

    id:               Mapped[int]            = mapped_column(Integer, primary_key=True, autoincrement=True)
    reference:        Mapped[str]            = mapped_column(String, nullable=False, unique=True)
    date:             Mapped[date]           = mapped_column(Date, nullable=False)
    pays_origine:     Mapped[str]            = mapped_column(String, nullable=False, default="Sénégal")
    produit:          Mapped[str]            = mapped_column(String, nullable=False)
    danger:           Mapped[str]            = mapped_column(String, nullable=False)
    categorie_danger: Mapped[str]            = mapped_column(String, nullable=False)
    valeur_mesuree:   Mapped[Optional[str]]  = mapped_column(String, nullable=True)
    unite:            Mapped[Optional[str]]  = mapped_column(String, nullable=True)
    limite_eu:        Mapped[Optional[str]]  = mapped_column(String, nullable=True)
    decision:         Mapped[str]            = mapped_column(String, nullable=False)
    fournisseur:      Mapped[Optional[str]]  = mapped_column(String, nullable=True)
    region_senegal:   Mapped[Optional[str]]  = mapped_column(String, nullable=True)
    created_at:       Mapped[Optional[datetime]] = mapped_column(
        DateTime, server_default=func.now(), nullable=True
    )

    def __repr__(self) -> str:
        return f"<RasffRejet ref={self.reference} danger={self.danger} date={self.date}>"
